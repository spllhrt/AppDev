const mongoose = require("mongoose");

const pollutionSourceLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  lat: Number,
  lon: Number,
  pollutants: Object,
  classificationResult: Object,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("PollutionSourceLog", pollutionSourceLogSchema);
