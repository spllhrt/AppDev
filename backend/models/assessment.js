const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    aqi: Number,
    pm25: Number,
    pm10: Number,
    riskScore: {
        type: Number,
        min: 0,
        max: 100
    },
    riskLevel: {
        type: String,
        enum: ['low', 'moderate', 'high', 'very_high']
    },
    recommendations: [String],
    breakdown: {
        environmental: Number,
        age: Number,
        healthConditions: Number,
        lifestyle: Number
    },
    aiInsights: [String],
    location: String,
    assessedAt: {
        type: Date,
        default: Date.now
    },
    generatedBy: {
        type: String,
        enum: ['Gemini AI', 'Rule-based (AI fallback)'],
        default: 'Gemini AI'
    }
});

module.exports = mongoose.model('Assessment', assessmentSchema);
