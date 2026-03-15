const express = require("express"); 
const router = express.Router();


router.post("/data-quality", async (req, res) => {
    const DataQuality = req.body.DataQuality;
    console.log(DataQuality); 
    res.send("Data Quality API here")
}); 

module.exports = router;
