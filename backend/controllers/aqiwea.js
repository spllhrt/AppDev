const axios = require('axios');
const AQIWeather = require('../models/aqiwea');
const User = require('../models/user');

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
