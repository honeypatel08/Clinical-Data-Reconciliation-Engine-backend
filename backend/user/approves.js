const express = require("express"); 
const router = express.Router();
const jwt = require('jsonwebtoken');
const historyDB = require("../db/reconcileDB"); 

const SECRET = process.env.JWT_SECRET;

// handel approves
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
     const stmt = historyDB.prepare(`
      INSERT INTO approvals (email, reconciled_medication, confidence_score, reasoning, recommended_actions, clinical_safety_check, status)
      VALUES (?, ?, ?, ?, ?, ?, 'approved')
    `);
    await stmt.run(
      email,
      reconciled_medication,
      confidence_score,
      reasoning,
      JSON.stringify(recommended_actions),
      clinical_safety_check
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(401).json({ success: false, message: "Invalid token" });
  }
});

router.get("/history", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "No token provided" });

  try {
    const decoded = jwt.verify(token, SECRET);
    const email = decoded.email;
    console.log(email); 
    historyDB.all(
      `SELECT email, reconciled_medication, confidence_score, reasoning, recommended_actions, clinical_safety_check, created_at FROM approvals
       WHERE email = ? AND status = 'approved'`,
      [email],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ approved: rows });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(401).json({ success: false, message: "Invalid token" });
  }
});

// debugging
router.get("/list", async (req, res) => {

  try {
    historyDB.all(
      `SELECT *  FROM approvals`,
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ approved: rows });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(401).json({ success: false, message: "Invalid token" });
  }
});




module.exports = router;