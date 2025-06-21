const express = require('express');
const router = express.Router();

// Import controller functions
const {
    createHealthRiskAssessment,
    updateHealthProfile,
    getHealthProfile,
    getLatestAssessment
} = require('../controllers/health');

// Import authentication middleware (assuming you have this from your auth setup)
const { isAuthenticatedUser } = require('../middlewares/auth');

// Health Profile Routes
router.route('/health/profile')
    .get(isAuthenticatedUser, getHealthProfile)       // GET /api/v1/health/profile
    .put(isAuthenticatedUser, updateHealthProfile);   // PUT /api/v1/health/profile

// Health Risk Assessment Routes
router.route('/health/assessment')
    .post(isAuthenticatedUser, createHealthRiskAssessment);  // POST /api/v1/health/assessment

// Get Latest Assessment
router.route('/health/assessment/latest')
    .get(isAuthenticatedUser, getLatestAssessment);    // GET /api/v1/health/assessment/latest

module.exports = router;