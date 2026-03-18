const express = require("express"); 
const router = express.Router();
const { generateClinicalReasoning } = require("../AI/gemini");
const { authenticateUser } = require("../middleware/middleware");
const { checkRateLimit } = require("../utils/rateLimiter");
const crypto = require("crypto");
const db = require("../db/db"); 

// generate a hash of payload input in body 
function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
router.post("/data-quality", authenticateUser,  async (req, res) => {
    try{
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

            db.run( 'INSERT OR REPLACE INTO ai_cache (input, output, created_at) VALUES (?, ?, ?)', [inputHash, JSON.stringify(parsed), Date.now()],
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
        res.status(500).json({ error: "Validate failed" });
    }
});

function buildPrompt(data) {
  return `
    You are a clinical data quality validation AI.
    Your job is to evaluate the quality of a patient record across these dimensions:
    - completeness (missing or empty fields)
    - accuracy (incorrect or suspicious values)
    - timeliness (outdated data)
    - clinical plausibility (medically possible values)
    You MUST detect:
    - impossible or extreme vital signs
    - missing critical fields 
    - outdated records
    - inconsistencies (e.g., condition without medication)
    Return ONLY valid JSON. No markdown. No explanation.
    Format:
    {
    "overall_score": number (0-100),
    "breakdown": {
        "completeness": number (0-100),
        "accuracy": number (0-100),
        "timeliness": number (0-100),
        "clinical_plausibility": number (0-100)
    },
    "issues_detected": [
        {
        "field": "field_name",
        "issue": "description",
        "severity": "low | medium | high"
        }
    ]
    }
    Scoring Guidelines:
    - Start from 100 and deduct for each issue
    - High severity: -20 to -40
    - Medium severity: -10 to -20
    - Low severity: -1 to -10

    Clinical Rules:
    - Blood pressure > 300 systolic is NOT plausible
    - Missing allergies = medium severity
    - Data older than 6 months = timeliness issue
    - Heart rate < 60 or > 100 = abnormal
    - Ensure values make medical sense
    Patient Record:
    ${JSON.stringify(data, null, 2)}`;
}

module.exports = router;
