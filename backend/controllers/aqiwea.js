const axios = require('axios');
const AQIWeather = require('../models/aqiwea');
const User = require('../models/user');

// Store AQI Weather Snapshot
exports.storeAQIWeatherSnapshot = async (req, res) => {
  try {
    const userId = req.user.id; // Assumes authenticated user
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Missing GPS coordinates' });
    }

    // Optional reverse geocoding
    let city = 'Unknown';
    try {
      const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`);
      city = geoRes.data?.results?.[0]?.name || 'Unknown';
    } catch (geoErr) {
      console.warn('Reverse geocoding failed:', geoErr.message);
    }

    // Fetch weather data
    const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover&timezone=auto`);
    const airRes = await axios.get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=auto`);

    const weather = weatherRes.data.current || {};
    const air = airRes.data.current || {};

    const snapshot = new AQIWeather({
      user: userId,
      location: {
        city,
        latitude,
        longitude
      },
      weather: {
        temperature_2m: weather.temperature_2m,
        relative_humidity_2m: weather.relative_humidity_2m,
        apparent_temperature: weather.apparent_temperature,
        precipitation: weather.precipitation,
        weather_code: weather.weather_code,
        surface_pressure: weather.surface_pressure,
        wind_speed_10m: weather.wind_speed_10m,
        wind_direction_10m: weather.wind_direction_10m,
        cloud_cover: weather.cloud_cover
      },
      air_quality: {
        us_aqi: air.us_aqi,
        pm10: air.pm10,
        pm2_5: air.pm2_5,
        carbon_monoxide: air.carbon_monoxide,
        nitrogen_dioxide: air.nitrogen_dioxide,
        sulphur_dioxide: air.sulphur_dioxide,
        ozone: air.ozone
      }
    });

    await snapshot.save();

    return res.status(201).json({
      success: true,
      message: 'AQI & weather snapshot saved',
      snapshot
    });
  } catch (err) {
    console.error('Error storing snapshot:', err.message);
    res.status(500).json({ error: 'Failed to store AQI & weather data' });
  }
};

// Get user's AQI weather history
exports.getUserHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, sortBy = 'date', sortOrder = 'desc' } = req.query;
    
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const snapshots = await AQIWeather.find({ user: userId })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email');

    const total = await AQIWeather.countDocuments({ user: userId });

    return res.status(200).json({
      success: true,
      snapshots,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: snapshots.length,
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('Error fetching user history:', error.message);
    res.status(500).json({ error: 'Failed to fetch user history' });
  }
};

// Get specific snapshot by ID
exports.getSnapshotById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const snapshot = await AQIWeather.findOne({ 
      _id: id, 
      user: userId 
    }).populate('user', 'name email');

    if (!snapshot) {
      return res.status(404).json({ 
        success: false,
        message: 'Snapshot not found or access denied' 
      });
    }

    return res.status(200).json({
      success: true,
      snapshot
    });
  } catch (error) {
    console.error('Error fetching snapshot:', error.message);
    res.status(500).json({ error: 'Failed to fetch snapshot' });
  }
};

// Delete specific AQI weather snapshot
exports.deleteAQIWeatherSnapshot = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const snapshot = await AQIWeather.findOneAndDelete({ 
      _id: id, 
      user: userId 
    });

    if (!snapshot) {
      return res.status(404).json({ 
        success: false,
        message: 'Snapshot not found or access denied' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Snapshot deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting snapshot:', error.message);
    res.status(500).json({ error: 'Failed to delete snapshot' });
  }
};

// Get user's statistics
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await AQIWeather.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSnapshots: { $sum: 1 },
          avgTemperature: { $avg: "$weather.temperature_2m" },
          avgHumidity: { $avg: "$weather.relative_humidity_2m" },
          avgAQI: { $avg: "$air_quality.us_aqi" },
          maxAQI: { $max: "$air_quality.us_aqi" },
          minAQI: { $min: "$air_quality.us_aqi" },
          avgPM25: { $avg: "$air_quality.pm2_5" },
          avgPM10: { $avg: "$air_quality.pm10" },
          cities: { $addToSet: "$location.city" }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      stats: stats[0] || {
        totalSnapshots: 0,
        avgTemperature: 0,
        avgHumidity: 0,
        avgAQI: 0,
        maxAQI: 0,
        minAQI: 0,
        avgPM25: 0,
        avgPM10: 0,
        cities: []
      },
      period: `${days} days`
    });
  } catch (error) {
    console.error('Error fetching user stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
};

// Admin: Get all users' AQI weather data
exports.getAllUsersAQIWeatherData = async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'date', sortOrder = 'desc' } = req.query;
    
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const snapshots = await AQIWeather.find()
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email city');

    const total = await AQIWeather.countDocuments();

    // Get summary statistics
    const stats = await AQIWeather.aggregate([
      {
        $group: {
          _id: null,
          totalSnapshots: { $sum: 1 },
          uniqueUsers: { $addToSet: "$user" },
          avgAQI: { $avg: "$air_quality.us_aqi" },
          maxAQI: { $max: "$air_quality.us_aqi" },
          minAQI: { $min: "$air_quality.us_aqi" },
          cities: { $addToSet: "$location.city" }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      snapshots,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: snapshots.length,
        totalRecords: total
      },
      summary: {
        totalSnapshots: stats[0]?.totalSnapshots || 0,
        uniqueUsers: stats[0]?.uniqueUsers?.length || 0,
        avgAQI: stats[0]?.avgAQI || 0,
        maxAQI: stats[0]?.maxAQI || 0,
        minAQI: stats[0]?.minAQI || 0,
        totalCities: stats[0]?.cities?.length || 0
      }
    });
  } catch (error) {
    console.error('Error fetching all users data:', error.message);
    res.status(500).json({ error: 'Failed to fetch all users AQI weather data' });
  }
};

// Admin: Delete all AQI weather data for a specific user
exports.deleteUserAQIWeatherData = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const result = await AQIWeather.deleteMany({ user: userId });

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} AQI weather records for user ${user.name}`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting user data:', error.message);
    res.status(500).json({ error: 'Failed to delete user AQI weather data' });
  }
};

// Admin: Get AQI weather data for a specific user
exports.getUserAQIWeatherData = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, sortBy = 'date', sortOrder = 'desc' } = req.query;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const snapshots = await AQIWeather.find({ user: userId })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email city');

    const total = await AQIWeather.countDocuments({ user: userId });

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        city: user.city
      },
      snapshots,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: snapshots.length,
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('Error fetching user AQI weather data:', error.message);
    res.status(500).json({ error: 'Failed to fetch user AQI weather data' });
  }
};

// Admin: Delete specific snapshot by ID (admin can delete any snapshot)
exports.deleteAnySnapshot = async (req, res) => {
  try {
    const { id } = req.params;

    const snapshot = await AQIWeather.findByIdAndDelete(id);

    if (!snapshot) {
      return res.status(404).json({ 
        success: false,
        message: 'Snapshot not found' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Snapshot deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting snapshot:', error.message);
    res.status(500).json({ error: 'Failed to delete snapshot' });
  }
};