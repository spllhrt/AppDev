const express = require('express');
const router = express.Router();
const { getClusterStats } = require('../controllers/clusters');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

// Protect the route and allow only admin users
router.get('/cluster-stats', isAuthenticatedUser, authorizeRoles('admin'), getClusterStats);

module.exports = router;
