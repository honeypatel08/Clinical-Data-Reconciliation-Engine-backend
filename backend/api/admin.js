const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const { authenticateAdmin } = require("../middleware/middleware");
const { sendAccountStatusEmail } = require("../services/email");
require("dotenv").config();

// Get all users
router.get("/users", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, providerName, email, status FROM users WHERE role = 'user'`
    );

    const rows = result.rows;
    const pending = rows.filter(u => u.status === "pending");
    const approved = rows.filter(u => u.status === "approved");
    const rejected = rows.filter(u => u.status === "rejected");

    res.json({ pending, approved, rejected });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update user status
router.post("/update-status", authenticateAdmin, async (req, res) => {
  const { useremail, status } = req.body;
  if (!useremail || !status || !Array.isArray(useremail) || useremail.length === 0) {
    return res.status(400).json({ error: "No users selected or invalid status" });
  }
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Status must be approved or rejected" });
  }

  try {
    const queryFetch = `SELECT email, providerName FROM users WHERE email = ANY($1)`;
    const fetchResult = await pool.query(queryFetch, [useremail]);
    const users = fetchResult.rows;

    // Update status in DB
    const queryUpdate = `UPDATE users SET status = $1 WHERE email = ANY($2)`;
    await pool.query(queryUpdate, [status, useremail]);

    const emailResults = await Promise.allSettled(
      users.map((user) => sendAccountStatusEmail({
        email: user.email,
        providerName: user.providername,
        status,
      }))
    );
    const emailFailures = emailResults
      .map((result, index) => ({ result, user: users[index] }))
      .filter(({ result }) => result.status === "rejected")
      .map(({ result, user }) => {
        console.error(`Account ${status} email failed for ${user.email}:`, result.reason.message);
        return { email: user.email, error: result.reason.message };
      });

    res.status(200).json({
      message: "User status updated successfully",
      email: {
        sent: users.length - emailFailures.length,
        failed: emailFailures.length,
        failures: emailFailures,
      },
    });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ error: "DB error updating status" });
  }
});

module.exports = router;
