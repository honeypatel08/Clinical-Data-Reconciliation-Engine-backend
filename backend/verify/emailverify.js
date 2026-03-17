const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const codes = require("./codes");
require("dotenv").config()


const generateCode = () => Math.floor(100000 + Math.random() * 900000);
const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_PASS,
  },
});

// UI will call this!!
router.post("/send-code", async (req, res) => {
  const { email } = req.body;
  console.log(email); 
  if (!email) return res.status(400).json({ error: "Email required" });

  const code = generateCode();
  codes[email] = { code, expires: Date.now() + 1 * 60 * 1000 }; // expires in 1min

  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: email,
    subject: "no-reply Verify your email",
    text: `Your verification code is: ${code}. It expires in 1 minute. Please verify your email!`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: "Code sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send email" });
  }
});


router.post("/verify-code", (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: "Email and code required" });

  const record = codes[email];
  if (!record) return res.status(400).json({ error: "No code sent to this email" });

  if (record.expires < Date.now()) {
    delete codes[email];
    return res.status(400).json({ error: "Code expired" });
  }

  if (record.code.toString() !== code.toString()) {
    return res.status(400).json({ error: "Invalid code" });
  }

  delete codes[email]; // code used, remove now 
  res.json({ message: "Email verified", valid: true });
});

module.exports = router;