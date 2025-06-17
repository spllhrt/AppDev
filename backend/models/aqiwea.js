const mongoose = require('mongoose');

const aqiWeatherSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  location: {
    city: { type: String },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  date: {
    type: Date,
    default: Date.now,
  },
  weather: {
    temperature_2m: Number,
    relative_humidity_2m: Number,
    apparent_temperature: Number,
    precipitation: Number,
    weather_code: Number,
    surface_pressure: Number,
    wind_speed_10m: Number,
    wind_direction_10m: Number,
    cloud_cover: Number,
  },
  air_quality: {
    us_aqi: Number,
    pm10: Number,
    pm2_5: Number,
    carbon_monoxide: Number,
    nitrogen_dioxide: Number,
    sulphur_dioxide: Number,
    ozone: Number,
  }
});

module.exports = mongoose.model('AQIWeather', aqiWeatherSchema);
