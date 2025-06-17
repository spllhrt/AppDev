const express = require('express');
const { 
  storeAQIWeatherSnapshot,
  getUserHistory,
  getSnapshotById,
  deleteAQIWeatherSnapshot,
  getUserStats,
  getAllUsersAQIWeatherData,
  deleteUserAQIWeatherData,
  getUserAQIWeatherData,
  deleteAnySnapshot
} = require('../controllers/aqiwea');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

// User routes - require authentication
router.post('/store-snapshot', isAuthenticatedUser, storeAQIWeatherSnapshot);
router.get('/my-history', isAuthenticatedUser, getUserHistory);
router.get('/my-stats', isAuthenticatedUser, getUserStats);
router.get('/snapshot/:id', isAuthenticatedUser, getSnapshotById);
router.delete('/snapshot/:id', isAuthenticatedUser, deleteAQIWeatherSnapshot);

// Admin routes - require authentication and admin role
router.get('/admin/all-data', isAuthenticatedUser, authorizeRoles('admin'), getAllUsersAQIWeatherData);
router.get('/admin/user/:userId', isAuthenticatedUser, authorizeRoles('admin'), getUserAQIWeatherData);
router.delete('/admin/user/:userId', isAuthenticatedUser, authorizeRoles('admin'), deleteUserAQIWeatherData);
router.delete('/admin/snapshot/:id', isAuthenticatedUser, authorizeRoles('admin'), deleteAnySnapshot);

module.exports = router;