// reconcile.js
const express = require("express");
const router = express.Router();
const { generateClinicalReasoning } = require("../AI/gemini");
const { authenticateUser } = require("../middleware/middleware");
const { checkRateLimit } = require("../utils/rateLimiter");
const pool = require("../db/db"); 
const crypto = require("crypto");

// generate a hash of payload input in body 
function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

// build AI prompt
function buildPrompt(data) {
  return `
    You are a clinical data reconciliation AI.
    Your job:
    - Analyze conflicting medication records
    - Determine the most likely correct medication
    - Consider:
      - recency
      - source reliability
      - patient conditions
      - lab values (especially kidney function)
    Return STRICT JSON:
    {
      "reconciled_medication": "...",
      "confidence_score": 0-1,
      "reasoning": "...",
      "recommended_actions": [],
      "clinical_safety_check": "PASSED or FAILED"
    }
    Patient Context:
    ${JSON.stringify(data.patient_context, null, 2)}
    Sources:
    ${JSON.stringify(data.sources, null, 2)}
  `;
}

router.post("/medication", authenticateUser, async (req, res) => {
  try {
    // rate limit
    const userId = req.user.id;
    const rate = checkRateLimit(userId, 30000);
    if (!rate.allowed) {
      return res.status(429).json({
        error: `Rate limit exceeded. Try again in ${rate.retryAfter}s`
      });
    }

    const data = req.body;
    const prompt = buildPrompt(data);
    const inputHash = hashPayload(data);

    // Check cache
    const cacheResult = await pool.query(
      'SELECT output FROM ai_cache WHERE input = $1',
      [inputHash]
    );

    if (cacheResult.rows.length > 0) {
      console.log("Cache hit");
      try {
        const cachedOutput = JSON.parse(cacheResult.rows[0].output);
        return res.json(cachedOutput);
      } catch (e) {
        console.error("Cache parse error:", e);
      }
    }

    // Cache miss: call AI
    console.log("Cache miss");
    const aiReply = await generateClinicalReasoning(prompt);
    const formatted = aiReply.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(formatted);
    } catch (e) {
      return res.status(500).json({
        error: "Invalid AI response format",
        raw: aiReply
      });
    }

    // Upsert cache into PostgreSQL
    await pool.query(
      `INSERT INTO ai_cache (input, output, created_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (input) DO UPDATE SET output = EXCLUDED.output, created_at = EXCLUDED.created_at`,
      [inputHash, JSON.stringify(parsed), Date.now()]
    );

    res.json(parsed);

  } catch (err) {
    console.error("Reconciliation error:", err);

    if (err.type === "RATE_LIMIT") {
      return res.status(429).json({
        error: "AI limit hit, try again later after 24 hrs."
      });
    }

    res.status(500).json({ error: "Reconciliation failed" });
  }
});

module.exports = router;