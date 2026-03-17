const express = require("express"); 
const router = express.Router();
const { authenticateUser } = require("../middleware/middleware");

router.post("/data-quality", authenticateUser,  async (req, res) => {
    const DataQuality = req.body.DataQuality;
    console.log(DataQuality); 
    res.send("Data Quality API here")
}); 

module.exports = router;
