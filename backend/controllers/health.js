const User = require("../models/user");

// Health Risk Assessment Controller
exports.createHealthRiskAssessment = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { aqi, pm25, pm10, location } = req.body;

        // Validate required environmental data
        if (!aqi || !pm25 || !pm10) {
            return res.status(400).json({
                success: false,
                message: "Air quality data (AQI, PM2.5, PM10) is required for assessment"
            });
        }

        // Get user data
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if required health profile data exists
        const missingFields = [];
        if (!user.age) missingFields.push('age');
        if (!user.gender) missingFields.push('gender');
        if (!user.outdoorExposure) missingFields.push('outdoorExposure');

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please complete your health profile before creating an assessment",
                missingFields: missingFields,
                requiredFields: {
                    age: "Your age (required for risk calculation)",
                    gender: "Gender (male/female/other/prefer_not_to_say)",
                    outdoorExposure: "Outdoor exposure level (low/moderate/high)"
                }
            });
        }

        // Calculate risk score
        const riskData = calculateHealthRiskScore(user, { aqi, pm25, pm10 });

        // Generate recommendations
        const recommendations = generateRecommendations(riskData, user);

        // Update user's last assessment
        user.lastAssessment = {
            riskScore: riskData.totalScore,
            riskLevel: riskData.riskLevel,
            aqi,
            pm25,
            pm10,
            recommendations,
            assessedAt: new Date()
        };

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Health risk assessment completed successfully",
            assessment: {
                riskScore: riskData.totalScore,
                riskLevel: riskData.riskLevel,
                breakdown: riskData.breakdown,
                environmentalData: { aqi, pm25, pm10 },
                recommendations,
                assessedAt: user.lastAssessment.assessedAt,
                location: location || user.city
            }
        });

    } catch (error) {
        console.error("Error in health risk assessment:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Update health profile
exports.updateHealthProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const {
            age,
            gender,
            isPregnant,
            isSmoker,
            hasAsthma,
            hasHeartDisease,
            hasRespiratoryIssues,
            outdoorExposure
        } = req.body;

        // Validate age if provided
        if (age && (age < 1 || age > 120)) {
            return res.status(400).json({
                success: false,
                message: "Age must be between 1 and 120"
            });
        }

        // Validate gender if provided
        const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
        if (gender && !validGenders.includes(gender)) {
            return res.status(400).json({
                success: false,
                message: "Invalid gender. Must be one of: " + validGenders.join(', ')
            });
        }

        // Validate outdoor exposure if provided
        const validExposureLevels = ['low', 'moderate', 'high'];
        if (outdoorExposure && !validExposureLevels.includes(outdoorExposure)) {
            return res.status(400).json({
                success: false,
                message: "Invalid outdoor exposure level. Must be one of: " + validExposureLevels.join(', ')
            });
        }

        // Build update object
        const updateData = {};
        if (age !== undefined) updateData.age = age;
        if (gender !== undefined) updateData.gender = gender;
        if (isPregnant !== undefined) updateData.isPregnant = isPregnant;
        if (isSmoker !== undefined) updateData.isSmoker = isSmoker;
        if (hasAsthma !== undefined) updateData.hasAsthma = hasAsthma;
        if (hasHeartDisease !== undefined) updateData.hasHeartDisease = hasHeartDisease;
        if (hasRespiratoryIssues !== undefined) updateData.hasRespiratoryIssues = hasRespiratoryIssues;
        if (outdoorExposure !== undefined) updateData.outdoorExposure = outdoorExposure;

        const user = await User.findByIdAndUpdate(userId, updateData, {
            new: true,
            runValidators: true
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Health profile updated successfully",
            healthProfile: {
                age: user.age,
                gender: user.gender,
                isPregnant: user.isPregnant,
                isSmoker: user.isSmoker,
                hasAsthma: user.hasAsthma,
                hasHeartDisease: user.hasHeartDisease,
                hasRespiratoryIssues: user.hasRespiratoryIssues,
                outdoorExposure: user.outdoorExposure
            }
        });

    } catch (error) {
        console.error("Error updating health profile:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Get health profile
exports.getHealthProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const healthProfile = {
            age: user.age,
            gender: user.gender,
            isPregnant: user.isPregnant,
            isSmoker: user.isSmoker,
            hasAsthma: user.hasAsthma,
            hasHeartDisease: user.hasHeartDisease,
            hasRespiratoryIssues: user.hasRespiratoryIssues,
            outdoorExposure: user.outdoorExposure,
            lastAssessment: user.lastAssessment
        };

        // Check completeness
        const requiredFields = ['age', 'gender', 'outdoorExposure'];
        const isComplete = requiredFields.every(field => user[field] !== undefined && user[field] !== null);

        return res.status(200).json({
            success: true,
            healthProfile,
            isComplete,
            requiredFields: requiredFields.filter(field => !user[field])
        });

    } catch (error) {
        console.error("Error fetching health profile:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Get latest assessment
exports.getLatestAssessment = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (!user.lastAssessment || !user.lastAssessment.riskScore) {
            return res.status(404).json({
                success: false,
                message: "No previous assessment found"
            });
        }

        return res.status(200).json({
            success: true,
            assessment: user.lastAssessment
        });

    } catch (error) {
        console.error("Error fetching latest assessment:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Helper function to calculate health risk score
function calculateHealthRiskScore(user, environmentalData) {
    let totalScore = 0;
    const breakdown = {};

    // Base environmental risk (40% of total score)
    const envScore = calculateEnvironmentalScore(environmentalData);
    totalScore += envScore;
    breakdown.environmental = envScore;

    // Age factor (20% of total score)
    const ageScore = calculateAgeScore(user.age);
    totalScore += ageScore;
    breakdown.age = ageScore;

    // Health conditions (25% of total score)
    const healthScore = calculateHealthConditionsScore(user);
    totalScore += healthScore;
    breakdown.healthConditions = healthScore;

    // Lifestyle factors (15% of total score)
    const lifestyleScore = calculateLifestyleScore(user);
    totalScore += lifestyleScore;
    breakdown.lifestyle = lifestyleScore;

    // Determine risk level
    let riskLevel;
    if (totalScore >= 75) riskLevel = 'very_high';
    else if (totalScore >= 50) riskLevel = 'high';
    else if (totalScore >= 25) riskLevel = 'moderate';
    else riskLevel = 'low';

    return {
        totalScore: Math.round(totalScore),
        riskLevel,
        breakdown
    };
}

function calculateEnvironmentalScore(data) {
    let score = 0;
    
    // AQI scoring (0-40 points)
    if (data.aqi >= 300) score += 40;
    else if (data.aqi >= 200) score += 35;
    else if (data.aqi >= 150) score += 30;
    else if (data.aqi >= 100) score += 20;
    else if (data.aqi >= 50) score += 10;
    else score += 5;

    return score;
}

function calculateAgeScore(age) {
    if (age >= 65) return 20;
    else if (age >= 45) return 15;
    else if (age <= 5) return 18;
    else if (age <= 12) return 12;
    else return 5;
}

function calculateHealthConditionsScore(user) {
    let score = 0;
    
    if (user.hasAsthma) score += 8;
    if (user.hasHeartDisease) score += 10;
    if (user.hasRespiratoryIssues) score += 7;
    if (user.isPregnant) score += 8;
    
    return score;
}

function calculateLifestyleScore(user) {
    let score = 0;
    
    if (user.isSmoker) score += 8;
    
    // Outdoor exposure
    if (user.outdoorExposure === 'high') score += 7;
    else if (user.outdoorExposure === 'moderate') score += 4;
    else score += 1;
    
    return score;
}

// Helper function to generate recommendations
function generateRecommendations(riskData, user) {
    const recommendations = [];
    
    // Risk level based recommendations
    if (riskData.riskLevel === 'very_high') {
        recommendations.push("Avoid all outdoor activities. Stay indoors with air purifiers running.");
        recommendations.push("Seek immediate medical attention if experiencing breathing difficulties.");
    } else if (riskData.riskLevel === 'high') {
        recommendations.push("Limit outdoor activities to essential tasks only.");
        recommendations.push("Wear N95 masks when going outside.");
    } else if (riskData.riskLevel === 'moderate') {
        recommendations.push("Reduce prolonged outdoor activities.");
        recommendations.push("Consider wearing masks during outdoor exercise.");
    } else {
        recommendations.push("Normal outdoor activities are generally safe.");
    }
    
    // Health condition specific recommendations
    if (user.hasAsthma) {
        recommendations.push("Keep your inhaler readily available and follow your asthma action plan.");
    }
    
    if (user.hasHeartDisease) {
        recommendations.push("Monitor your symptoms closely and contact your doctor if you experience chest pain or unusual fatigue.");
    }
    
    if (user.isPregnant) {
        recommendations.push("Consult with your healthcare provider about air quality precautions during pregnancy.");
    }
    
    if (user.isSmoker) {
        recommendations.push("Consider quitting smoking to reduce additional respiratory risks.");
    }
    
    // Age-specific recommendations
    if (user.age >= 65) {
        recommendations.push("Seniors should be extra cautious during poor air quality days.");
    }
    
    if (user.age <= 12) {
        recommendations.push("Children should limit outdoor play during poor air quality periods.");
    }
    
    return recommendations;
}