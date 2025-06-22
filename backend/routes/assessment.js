const express = require('express');
const router = express.Router();

const {
  getAllAssessments,
  getUserAssessments,
  getAssessmentById,
  deleteAssessment
} = require('../controllers/assessment');

const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

// Get logged-in user's assessments
router.get('/assessment/me', isAuthenticatedUser, getUserAssessments);

// Get one assessment by id (owner or admin)
router.get('/assessment/:id', isAuthenticatedUser, getAssessmentById);

// Admin: Get all assessments
router.get('/admin/assessments', isAuthenticatedUser, authorizeRoles('admin'), getAllAssessments);

// Admin: Delete assessment
router.delete('/admin/assessment/:id', isAuthenticatedUser, authorizeRoles('admin'), deleteAssessment);

module.exports = router;
