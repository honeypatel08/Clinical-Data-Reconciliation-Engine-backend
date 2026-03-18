const express = require("express"); 
const router = express.Router();
const { generateClinicalReasoning } = require("../AI/gemini");
const { authenticateUser } = require("../middleware/middleware");

router.post("/data-quality", authenticateUser,  async (req, res) => {
    try{
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
        res.status(500).json({ error: "Data-Quality failed"
    });
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
