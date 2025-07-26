const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter your name'],
        maxLength: [30, 'Your name cannot exceed 30 characters']
    },
    email: {
        type: String,
        required: [true, 'Please enter your email'],
        unique: true,
        validate: [validator.isEmail, 'Please enter valid email address']
    },
    password: {
        type: String,
        required: [true, 'Please enter your password'],
        minlength: [6, 'Your password must be longer than 6 characters'],
        select: false
    },
    avatar: {
        public_id: {
            type: String,
        },
        url: {
            type: String,
        }
    },
    city: {
        type: String,
        required: [true, 'Please enter your City'],
    },
    role: {
        type: String,
        default: 'user'
    },
    status: {
        type: String,
        default: 'active'
    },
    // Health-related fields for risk assessment
    age: {
        type: Number,
        min: [1],
        max: [120, 'Age cannot exceed 120']
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    isPregnant: {
        type: Boolean,
        default: false
    },
    isSmoker: {
        type: Boolean,
        default: false
    },
    hasAsthma: {
        type: Boolean,
        default: false
    },
    hasHeartDisease: {
        type: Boolean,
        default: false
    },
    hasRespiratoryIssues: {
        type: Boolean,
        default: false
    },
    outdoorExposure: {
        type: String,
        enum: ['low', 'moderate', 'high'],
        default: 'moderate'
    },
    clusters: {
        type: [String],
        default: []
    },
    // Store latest assessment results
    // Updated lastAssessment field for User schema
    lastAssessment: {
        riskScore: {
            type: Number,
            min: 0,
            max: 100
        },
        riskLevel: {
            type: String,
            enum: ['low', 'moderate', 'high', 'very_high']
        },
        aqi: Number,
        pm25: Number,
        pm10: Number,
        recommendations: [String],
        // ADD THESE MISSING FIELDS:
        breakdown: {
            environmental: Number,
            ageRiskScore: Number,
            actualAge: Number,  // Add this if missing
            healthConditions: Number,
            lifestyle: Number
        },
        aiInsights: [String],  // For storing AI-generated insights
        location: String,      // For storing assessment location
        assessedAt: {
            type: Date,
            default: Date.now
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next()
    }
    this.password = await bcrypt.hash(this.password, 10)  // Hash password before saving
});

userSchema.methods.getJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_TIME
    });
}

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
}

module.exports = mongoose.model('User', userSchema);