const express = require("express"); 
const router = express.Router();
const { generateClinicalReasoning } = require("../AI/gemini");
const { authenticateUser } = require("../middleware/middleware");
const { checkRateLimit } = require("../utils/rateLimiter");


router.post("/medication", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const rate = checkRateLimit(userId, 30000);
    if (!rate.allowed) {
      return res.status(429).json({
        error: `Rate limit exceeded. Try again in ${rate.retryAfter}s`
      });
    }

    const data = req.body;
    const prompt = buildPrompt(data);
    const aiReply = await generateClinicalReasoning(prompt);
    const formated = aiReply.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(formated);
    } catch (e) {
      return res.status(500).json({
        error: "Invalid AI response format",
        raw: aiReply
      });
    }
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Reconciliation failed"
    });
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