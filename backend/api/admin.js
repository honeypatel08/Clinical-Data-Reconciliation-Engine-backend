const express = require("express");
const router = express.Router();
const db = require("../db/db"); 
const { authenticateAdmin } = require("../middleware/middleware");

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

router.post("/update-status", authenticateAdmin, (req, res) => {
  const { useremail, status} = req.body 
  console.log(useremail); 
  console.log(status);
  if (!useremail || useremail.length === 0 || !status) {
    return res.status(400).json({ error: "No users selected or invalid status" });
  }
  const placeholders = useremail.map(() => "?").join(","); // "?, ?, ?" idk what this is chat maybe ask rishi why ? nvm 

  db.run(
    `UPDATE users SET status = ? WHERE email IN (${placeholders})`, [status, ...useremail],
    function (err) {
      if (err) return res.status(500).json({ error: "DB error" });

      // this.changes = number of rows updated
     return res.status(200).json({ message: `user(s) updated to` }); 
      
    });
    }
);

 
module.exports = router;