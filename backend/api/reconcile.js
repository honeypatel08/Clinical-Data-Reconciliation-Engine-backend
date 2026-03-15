const express = require("express"); 
const router = express.Router();


router.post("/medication", async (req, res) => {
    const name = req.body.name;
    console.log(name); 
    res.send("Reconcile API here")
}); 

module.exports = router;
