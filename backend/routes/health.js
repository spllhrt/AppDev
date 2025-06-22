const express = require('express');
const router = express.Router();

// Import health controller
const healthController = require('../controllers/health');

const { isAuthenticatedUser } = require('../middlewares/auth');

router.use(isAuthenticatedUser);

router.get('/profile', healthController.getHealthProfile);

router.put('/profile', healthController.updateHealthProfile);

router.post('/assessment', healthController.createHealthRiskAssessment);

router.get('/assessment/latest', healthController.getLatestAssessment);

router.get('/assessment/history', healthController.getAssessmentHistory);

router.post('/ai-insights', healthController.getAIInsights);

router.get('/profile/completeness', healthController.checkProfileCompleteness);

router.post('/validate-assessment', healthController.validateAssessmentData);

router.get('/aqi-info/:aqi', healthController.getAQIInfo);

router.post('/reassessment-check', healthController.checkReassessmentNeeded);

module.exports = router;