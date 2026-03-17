const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../db/db"); 
const jwt = require("jsonwebtoken");

//log in 
router.post('/log-in', (req, res) =>{
  const { email, password} = req.body 
  console.log("Received log in: ", req.body)

  if(!email || !password){
    return res.status(400).json({ error: "Missing Login infomation!"}); 
  }
  console.log(email);

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!user) return res.status(401).json({ error: "Invalid Email or Email does not exits! Try Agian" });

    if(user.status === "pending"){
      return res.status(403).json({ error: "Account pending for approval" });
    }
    if(user.status === "rejected"){
      return res.status(403).json({ error: "Account Register Decline" });
    }

    const computePasswordHAsh = await bcrypt.compare(password, user.password);
    if (!computePasswordHAsh) return res.status(401).json({ error: "Invaild Password" });

    const token = jwt.sign({ email:user.email, role: user.role }, process.env.JWT_SECRET );

    res.json({ 
      token,
      role: user.role,
      name: user.providerName
    });
  });
})
 
// Register user
router.post('/register', async (req, res) => {
  const { providerName, email, password } = req.body;
  console.log("Received body:", req.body);
  // cross check if any empty checked in frontend as well
  if (!providerName || !email || !password) {
    return res.status(400).json({
      error: "Missing Provider Name, email, or password required"
    });
  }

  try{
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `
      INSERT INTO users (providerName, email, password)
      VALUES (?, ?, ?)
    `;

    db.run(sql, [providerName, email, hashedPassword], function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(400).json({ error: "Email already registered" });
        }
        return res.status(500).json({ error: err.message });
      }

      res.status(200).json({
        message: "Request to register your account is successful! Waiting for admin approval.\nKeep checking your email to get approval notification by the admin!",
        userId: this.lastID,
      });
    });
  } catch (error) {
    res.status(500).json({ error: "server error" });
  }
});

module.exports = router;