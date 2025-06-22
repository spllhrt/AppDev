const express = require("express");
const router = express.Router();
const { classifyPollutionSource } = require("../controllers/sourceController");

router.post("/classify", classifyPollutionSource);
module.exports = router;
