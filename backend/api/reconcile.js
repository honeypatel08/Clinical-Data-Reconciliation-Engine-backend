const express = require("express"); 
const router = express.Router();
const { generateClinicalReasoning } = require("../AI/gemini");
const { authenticateUser } = require("../middleware/middleware");
const { checkRateLimit } = require("../utils/rateLimiter");
const db = require("../db/db"); 
const crypto = require("crypto");

// generate a hash of payload input in body 
function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
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

    // Cache here so no extra ai api call
    const inputHash = hashPayload(data);
    db.get('SELECT output FROM ai_cache WHERE input = ?', [inputHash], async (err, row) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ error: "Error" });
      }
      if (row) {
        console.log("Cache hit");
        try {
          const cachedOutput = JSON.parse(row.output);
          return res.json(cachedOutput);
        } catch (e) {
          console.error("Cache parse error:", e);
        }
      }
      //c ache miss 
      try {
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
        db.run(
          'INSERT OR REPLACE INTO ai_cache (input, output, created_at) VALUES (?, ?, ?)',
          [inputHash, JSON.stringify(parsed), Date.now()],
          (err) => {
            if (err) console.error("Cache insert error:", err);
          }
        );
        res.json(parsed);
      } catch (aiErr) {
        console.error("AI call error:", aiErr);
        if (aiErr.type === "RATE_LIMIT") {
          if (row) {
            return res.json(JSON.parse(row.output));
          }

          return res.status(429).json({
            error: "AI limit hit, try again later after 24 hrs. "
          });
        }
        res.status(500).json({ error: "AI processing failed" });
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Reconciliation failed" });
  }
});

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


module.exports = router;