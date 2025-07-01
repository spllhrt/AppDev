const express = require("express");
const router = express.Router();
const { classifyPollutionSource, getPollutionLogs } = require("../controllers/sourceController");
const { isAuthenticatedUser,  authorizeRoles } = require('../middlewares/auth');

router.post("/classify", isAuthenticatedUser, classifyPollutionSource);
router.get("/pollution-sources", isAuthenticatedUser, authorizeRoles("admin"), getPollutionLogs);

module.exports = router;


