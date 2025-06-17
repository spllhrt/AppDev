const express = require('express');
const { storeAQIWeatherSnapshot } = require('../controllers/aqiwea');
const { isAuthenticatedUser } = require('../middlewares/auth');

const router = express.Router();

router.post('/store-snapshot', isAuthenticatedUser, storeAQIWeatherSnapshot);

module.exports = router;
