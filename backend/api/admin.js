const express = require("express");
const router = express.Router();
const db = require("../db/db"); 
const { authenticateAdmin } = require("../middleware/middleware");
const nodemailer = require("nodemailer");
require("dotenv").config()


// Get all users
router.get("/users", authenticateAdmin,  (req, res) => {

  db.all(
    `SELECT id, providerName, email, status FROM users WHERE role='user'`,
    [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const pending = rows.filter(u => u.status === "pending");
        const approved = rows.filter(u => u.status === "approved");
        const rejected = rows.filter(u => u.status === "rejected");
        res.json({ pending, approved, rejected });
    }
  );
});

const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_PASS,
  },
});

router.post("/update-status", authenticateAdmin, (req, res) => {
  const { useremail, status} = req.body 
  console.log(useremail); 
  console.log(status);
  if (!useremail || useremail.length === 0 || !status) {
    return res.status(400).json({ error: "No users selected or invalid status" });
  }
  const placeholders = useremail.map(() => "?").join(","); // "?, ?, ?" idk what this is chat maybe ask rishi why ? nvm 

  db.all(`SELECT email, providerName FROM users WHERE email IN (${placeholders})`, useremail, (err, rows) => {
    if (err) return res.status(500).json({ error: "DB Error" });

    db.run(`UPDATE users SET status = ? WHERE email IN (${placeholders})`, [status, ...useremail], function (err) {
      if (err) return res.status(500).json({ error: "DB error updating status" });

      if (status === "approved") {
        rows.forEach(user => {
          const mailOptions = {
            from: process.env.ADMIN_EMAIL,
            to: user.email,
            subject: "Your account has been approved",
            text: `Hello ${user.providerName},\n\nYour account registration request has been approved. You can now log in to the system.\n\nBest,\nAdmin Team`
          };
          transporter.sendMail(mailOptions, (err, info) => {
            if (err) console.error("Error Sending Email", user.email, err);
          });
        });
      }
      return res.status(200).json({ message: `Updated` });
    });
  });
});

 
module.exports = router;