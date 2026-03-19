// approve.js
const express = require("express"); 
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require("../db/db"); // PostgreSQL Pool
const SECRET = process.env.JWT_SECRET;

// handle reconcile approvals
router.post("/", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "No token provided" });

  try {
    const decoded = jwt.verify(token, SECRET);
    const email = decoded.email;
    const role = decoded.role;

    if (role !== 'user' && role !== 'admin') {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { reconciled_medication, confidence_score, reasoning, recommended_actions, clinical_safety_check } = req.body;

    await pool.query(
      `INSERT INTO approvals 
        (email, reconciled_medication, confidence_score, reasoning, recommended_actions, clinical_safety_check, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'approved')`,
      [
        email,
        reconciled_medication,
        confidence_score,
        reasoning,
        JSON.stringify(recommended_actions),
        clinical_safety_check
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Approve POST error:", err);
    res.status(401).json({ success: false, message: "Invalid token or server error" });
  }
});

// Get approval history for logged-in user
router.get("/history", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "No token provided" });

  try {
    const decoded = jwt.verify(token, SECRET);
    const email = decoded.email;

    const result = await pool.query(
      `SELECT email, reconciled_medication, confidence_score, reasoning, recommended_actions, clinical_safety_check, created_at
       FROM approvals
       WHERE email = $1 AND status = 'approved'`,
      [email]
    );

    res.json({ approved: result.rows });
  } catch (err) {
    console.error("Approve GET history error:", err);
    res.status(401).json({ success: false, message: "Invalid token or server error" });
  }
});

router.post("/data-quality", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "No token" });
  try {
    const decoded = jwt.verify(token, SECRET);
    const email = decoded.email;
    const { overall_score, breakdown, issues_detected } = req.body;

    await pool.query(
      `INSERT INTO data_quality_approvals (email, overall_score, breakdown, issues_detected, status)
       VALUES ($1, $2, $3, $4, 'approved')`,
      [
        email,
        overall_score,
        JSON.stringify(breakdown),
        JSON.stringify(issues_detected)
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Data Quality Approve error:", err);
    res.status(401).json({ success: false });
  }
});

router.get("/data-quality/history", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    const email = decoded.email;

    const result = await pool.query(
      `SELECT overall_score, breakdown, issues_detected, created_at FROM data_quality_approvals
       WHERE email = $1 AND status = 'approved' ORDER BY created_at DESC`, [email]
    );
    res.json({ approved: result.rows });
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

module.exports = router;