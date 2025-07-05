const express = require("express");
const router = express.Router();
const upload = require("../utils/multer");
const {
  submitReport,
  getAllReports,
  updateReport,
  getMyReports
} = require("../controllers/Report");

const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');


// User Routes
router.post('/submit', isAuthenticatedUser, upload.single('photo'), submitReport);
router.get('/my', isAuthenticatedUser, getMyReports);

// Admin Routes
router.get('/admin/all', isAuthenticatedUser, authorizeRoles('admin'), getAllReports);
router.put('/admin/update/:id', isAuthenticatedUser, authorizeRoles('admin'), updateReport);

module.exports = router;