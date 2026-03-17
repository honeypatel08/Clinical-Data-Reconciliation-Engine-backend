const express = require("express"); 
const router = express.Router();
const { authenticateUser } = require("../middleware/middleware");


router.post("/medication", authenticateUser,  async (req, res) => {
    const name = req.body.name;
    console.log(name); 
    res.send("Reconcile API here")
}); 

module.exports = router;
