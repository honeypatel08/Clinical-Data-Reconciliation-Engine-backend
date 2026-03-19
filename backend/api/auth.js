// auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../db/db"); 
const jwt = require("jsonwebtoken");


router.post("/log-in", async (req, res) => {
  const { email, password } = req.body;
  console.log("Received log in: ", req.body);
  if (!email || !password) {
    return res.status(400).json({ error: "Missing Login information!" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid email or email does not exist!" });
    }

    if (user.status === "pending") {
      return res.status(403).json({ error: "Account pending for approval" });
    }

    if (user.status === "rejected") {
      return res.status(403).json({ error: "Account registration declined" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = jwt.sign(
      { email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: user.role,
      name: user.providerName
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


router.post("/register", async (req, res) => {
  const { providerName, email, password } = req.body;
  console.log("Received body:", req.body);

  if (!providerName || !email || !password) {
    return res.status(400).json({
      error: "Missing Provider Name, email, or password"
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (providerName, email, password)
       VALUES ($1, $2, $3)`,
      [providerName, email, hashedPassword]
    );

    res.status(200).json({
      message: "Request to register your account is successful! Waiting for admin approval.\nKeep checking your email to get approval notification by the admin!"
    });
  } catch (err) {
    // Postgres unique constraint violation code
    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already registered" });
    }
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;