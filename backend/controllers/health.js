const User = require("../models/user");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Assessment = require('../models/assessment');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Health Risk Assessment Controller with Gemini AI
exports.createHealthRiskAssessment = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { aqi, pm25, pm10, location } = req.body;

        if (!aqi || !pm25 || !pm10) {
            return res.status(400).json({
                success: false,
                message: "Air quality data (AQI, PM2.5, PM10) is required for assessment"
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const missingFields = [];
        if (!user.age) missingFields.push('age');
        if (!user.gender) missingFields.push('gender');
        if (!user.outdoorExposure) missingFields.push('outdoorExposure');
        if (user.isPregnant === undefined || user.isPregnant === null) missingFields.push('isPregnant');
        if (user.isSmoker === undefined || user.isSmoker === null) missingFields.push('isSmoker');
        if (user.hasAsthma === undefined || user.hasAsthma === null) missingFields.push('hasAsthma');
        if (user.hasHeartDisease === undefined || user.hasHeartDisease === null) missingFields.push('hasHeartDisease');
        if (user.hasRespiratoryIssues === undefined || user.hasRespiratoryIssues === null) missingFields.push('hasRespiratoryIssues');

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please complete your health profile before creating an assessment",
                missingFields,
                requiredFields: {
                    age: "Your age (required for risk calculation)",
                    gender: "Gender (male/female/other/prefer_not_to_say)",
                    outdoorExposure: "Outdoor exposure level (low/moderate/high)",
                    isPregnant: "Pregnancy status (true/false)",
                    isSmoker: "Smoking status (true/false)",
                    hasAsthma: "Asthma condition (true/false)",
                    hasHeartDisease: "Heart disease condition (true/false)",
                    hasRespiratoryIssues: "Respiratory issues condition (true/false)"
                }
            });
        }

        const aiAssessment = await generateAIHealthRiskAssessment(user, { aqi, pm25, pm10 });

        // Save full history
        const newAssessment = await Assessment.create({
            user: user._id,
            aqi,
            pm25,
            pm10,
            riskScore: aiAssessment.riskScore,
            riskLevel: aiAssessment.riskLevel,
            recommendations: aiAssessment.recommendations,
            breakdown: aiAssessment.breakdown,
            aiInsights: aiAssessment.insights,
            location: location || user.city,
            generatedBy: 'Gemini AI'
        });

        // Update latest summary
        user.lastAssessment = {
            riskScore: aiAssessment.riskScore,
            riskLevel: aiAssessment.riskLevel,
            aqi,
            pm25,
            pm10,
            recommendations: aiAssessment.recommendations,
            breakdown: aiAssessment.breakdown,
            aiInsights: aiAssessment.insights,
            location: location || user.city,
            assessedAt: newAssessment.assessedAt
        };

        await user.save();

        return res.status(200).json({
            success: true,
            message: "AI-powered health risk assessment completed successfully",
            assessment: newAssessment
        });

    } catch (error) {
        console.error("Error in AI health risk assessment:", error);
        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            const fallback = calculateHealthRiskScore(user, { aqi, pm25, pm10 });
            const fallbackRecs = generateRecommendations(fallback, user);

            const fallbackAssessment = await Assessment.create({
                user: user._id,
                aqi,
                pm25,
                pm10,
                riskScore: fallback.totalScore,
                riskLevel: fallback.riskLevel,
                recommendations: fallbackRecs,
                breakdown: fallback.breakdown,
                location: location || user.city,
                generatedBy: 'Rule-based (AI fallback)'
            });

            user.lastAssessment = {
                riskScore: fallback.totalScore,
                riskLevel: fallback.riskLevel,
                aqi,
                pm25,
                pm10,
                recommendations: fallbackRecs,
                breakdown: fallback.breakdown,
                location: fallbackAssessment.location,
                assessedAt: fallbackAssessment.assessedAt
            };

            await user.save();

            return res.status(200).json({
                success: true,
                message: "Health risk assessment completed (fallback mode)",
                assessment: fallbackAssessment
            });

        } catch (fallbackError) {
            console.error("Fallback assessment failed:", fallbackError);
            return res.status(500).json({
                success: false,
                message: "Assessment service temporarily unavailable",
                error: "Both AI and fallback systems encountered errors"
            });
        }
    }
};

// AI-powered risk assessment function
async function generateAIHealthRiskAssessment(user, environmentalData) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
You are a health risk assessment expert. Analyze the following data and provide a comprehensive health risk assessment for air quality exposure.

USER PROFILE:
- Age: ${user.age}
- Gender: ${user.gender}
- Pregnant: ${user.isPregnant ? 'Yes' : 'No'}
- Smoker: ${user.isSmoker ? 'Yes' : 'No'}
- Has Asthma: ${user.hasAsthma ? 'Yes' : 'No'}
- Has Heart Disease: ${user.hasHeartDisease ? 'Yes' : 'No'}
- Has Respiratory Issues: ${user.hasRespiratoryIssues ? 'Yes' : 'No'}
- Outdoor Exposure Level: ${user.outdoorExposure}

ENVIRONMENTAL DATA:
- Air Quality Index (AQI): ${environmentalData.aqi}
- PM2.5: ${environmentalData.pm25} μg/m³
- PM10: ${environmentalData.pm10} μg/m³

TASK: Provide a detailed health risk assessment in the following JSON format:

{
  "riskScore": [0-100 integer],
  "riskLevel": "[low/moderate/high/very_high]",
  "breakdown": {
    "environmental": [0-40 integer],
    "age": [0-20 integer],
    "healthConditions": [0-25 integer],
    "lifestyle": [0-15 integer]
  },
  "recommendations": [
    "specific actionable recommendation 1",
    "specific actionable recommendation 2",
    "specific actionable recommendation 3"
  ],
  "insights": [
    "key health insight 1",
    "key health insight 2",
    "key health insight 3"
  ]
}

GUIDELINES:
1. Risk Score: 0-24 (low), 25-49 (moderate), 50-74 (high), 75-100 (very_high)
2. Environmental score should be heavily weighted by AQI and PM values (MAX: 40 points)
3. Age factor: higher risk for children under 12 and adults over 65 (MAX: 20 points)
4. Health conditions significantly increase risk (MAX: 25 points)
5. Lifestyle factors like smoking and outdoor exposure affect risk (MAX: 15 points)
6. CRITICAL: Each breakdown score MUST NOT exceed its maximum value
7. Recommendations should be specific, actionable, and personalized
8. Insights should explain the reasoning behind the risk assessment
9. Consider cumulative effects of multiple risk factors
10. Be medically accurate but avoid providing direct medical advice

Respond ONLY with the JSON object, no additional text.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the AI response
        let aiResponse;
        try {
            const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
            aiResponse = JSON.parse(cleanText);
        } catch (parseError) {
            console.error("Error parsing AI response:", parseError);
            console.log("Raw AI response:", text);
            throw new Error("Failed to parse AI response");
        }

        // Validate the AI response structure
        if (!aiResponse.riskScore || !aiResponse.riskLevel || !aiResponse.breakdown || 
            !aiResponse.recommendations || !aiResponse.insights) {
            throw new Error("Invalid AI response structure");
        }

        // Ensure risk score is within bounds
        aiResponse.riskScore = Math.max(0, Math.min(100, parseInt(aiResponse.riskScore)));

        // CRITICAL FIX: Enforce maximum limits for breakdown scores
        if (aiResponse.breakdown) {
            aiResponse.breakdown.environmental = Math.max(0, Math.min(40, parseInt(aiResponse.breakdown.environmental || 0)));
            aiResponse.breakdown.age = Math.max(0, Math.min(20, parseInt(aiResponse.breakdown.age || 0)));
            aiResponse.breakdown.healthConditions = Math.max(0, Math.min(25, parseInt(aiResponse.breakdown.healthConditions || 0)));
            aiResponse.breakdown.lifestyle = Math.max(0, Math.min(15, parseInt(aiResponse.breakdown.lifestyle || 0)));
            
            // Recalculate total risk score based on capped breakdown scores
            const calculatedScore = aiResponse.breakdown.environmental + 
                                  aiResponse.breakdown.age + 
                                  aiResponse.breakdown.healthConditions + 
                                  aiResponse.breakdown.lifestyle;
            
            // Use the calculated score if it's significantly different from the AI's original score
            if (Math.abs(calculatedScore - aiResponse.riskScore) > 5) {
                aiResponse.riskScore = Math.min(100, calculatedScore);
            }
        }

        // Validate risk level matches score
        const validRiskLevels = ['low', 'moderate', 'high', 'very_high'];
        if (!validRiskLevels.includes(aiResponse.riskLevel)) {
            // Auto-correct risk level based on score
            if (aiResponse.riskScore >= 75) aiResponse.riskLevel = 'very_high';
            else if (aiResponse.riskScore >= 50) aiResponse.riskLevel = 'high';
            else if (aiResponse.riskScore >= 25) aiResponse.riskLevel = 'moderate';
            else aiResponse.riskLevel = 'low';
        }

        // Double-check risk level matches the final score
        if (aiResponse.riskScore >= 75 && aiResponse.riskLevel !== 'very_high') aiResponse.riskLevel = 'very_high';
        else if (aiResponse.riskScore >= 50 && aiResponse.riskScore < 75 && aiResponse.riskLevel !== 'high') aiResponse.riskLevel = 'high';
        else if (aiResponse.riskScore >= 25 && aiResponse.riskScore < 50 && aiResponse.riskLevel !== 'moderate') aiResponse.riskLevel = 'moderate';
        else if (aiResponse.riskScore < 25 && aiResponse.riskLevel !== 'low') aiResponse.riskLevel = 'low';

        return aiResponse;

    } catch (error) {
        console.error("Error in AI health risk assessment:", error);
        throw error;
    }
}

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

        const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
        const validExposureLevels = ['low', 'moderate', 'high'];

        if (age && (age < 1 || age > 120)) {
            return res.status(400).json({ success: false, message: "Age must be between 1 and 120" });
        }

        if (gender && !validGenders.includes(gender)) {
            return res.status(400).json({ success: false, message: "Invalid gender. Must be one of: " + validGenders.join(', ') });
        }

        if (outdoorExposure && !validExposureLevels.includes(outdoorExposure)) {
            return res.status(400).json({ success: false, message: "Invalid outdoor exposure level. Must be one of: " + validExposureLevels.join(', ') });
        }

        const updateData = {};
        if (age !== undefined) updateData.age = age;
        if (gender !== undefined) updateData.gender = gender;
        if (isPregnant !== undefined) updateData.isPregnant = isPregnant;
        if (isSmoker !== undefined) updateData.isSmoker = isSmoker;
        if (hasAsthma !== undefined) updateData.hasAsthma = hasAsthma;
        if (hasHeartDisease !== undefined) updateData.hasHeartDisease = hasHeartDisease;
        if (hasRespiratoryIssues !== undefined) updateData.hasRespiratoryIssues = hasRespiratoryIssues;
        if (outdoorExposure !== undefined) updateData.outdoorExposure = outdoorExposure;

        let user = await User.findByIdAndUpdate(userId, updateData, {
            new: true,
            runValidators: true
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Clustering logic here:
        const clusters = [];

        if (user.age > 60 && (user.hasAsthma || user.hasRespiratoryIssues)) {
            clusters.push("Elderly Respiratory");
        }
        if (user.isSmoker) {
            clusters.push("Smokers");
        }
        if (user.age < 18 && user.outdoorExposure === "high") {
            clusters.push("Outdoor Youth");
        }
        if (clusters.length === 0) {
            clusters.push("General Population");
        }

        user.clusters = clusters;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Health profile updated successfully",
            clusters: user.clusters,
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

// Get assessment history
exports.getAssessmentHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const assessments = await Assessment.find({ user: userId })
            .sort({ assessedAt: -1 })
            .limit(limit);

        return res.status(200).json({
            success: true,
            assessments,
            count: assessments.length
        });

    } catch (error) {
        console.error("Error fetching assessment history:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Admin: Delete assessment by ID
exports.deleteAssessment = async (req, res, next) => {
    try {
        const assessmentId = req.params.id;

        // Verify the assessment exists
        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Assessment not found"
            });
        }

        // Delete the assessment
        await Assessment.findByIdAndDelete(assessmentId);

        // Remove reference from user's lastAssessment if this was their most recent one
        const user = await User.findById(assessment.user);
        if (user && user.lastAssessment && user.lastAssessment._id.equals(assessment._id)) {
            user.lastAssessment = null;
            await user.save();
        }

        return res.status(200).json({
            success: true,
            message: "Assessment deleted successfully",
            deletedAssessment: {
                id: assessment._id,
                assessedAt: assessment.assessedAt,
                riskLevel: assessment.riskLevel
            }
        });

    } catch (error) {
        console.error("Error deleting assessment:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete assessment",
            error: error.message
        });
    }
};

// [All remaining helper functions stay exactly the same...]

// Fallback rule-based functions
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

// Get AI insights
exports.getAIInsights = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { aqi, pm25, pm10, focusArea } = req.body;

        // Validate required data
        if (!aqi || !pm25 || !pm10) {
            return res.status(400).json({
                success: false,
                message: "Air quality data (AQI, PM2.5, PM10) is required"
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Generate focused AI insights
        const insights = await generateFocusedAIInsights(user, { aqi, pm25, pm10 }, focusArea);

        return res.status(200).json({
            success: true,
            insights,
            focusArea: focusArea || 'general',
            generatedAt: new Date()
        });

    } catch (error) {
        console.error("Error generating AI insights:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate AI insights",
            error: error.message
        });
    }
};

// Helper function to generate focused AI insights
async function generateFocusedAIInsights(user, environmentalData, focusArea) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let focusPrompt = "";
        switch (focusArea) {
            case 'recommendations':
                focusPrompt = "Focus primarily on actionable recommendations and protective measures.";
                break;
            case 'risk_factors':
                focusPrompt = "Focus on explaining the specific risk factors and their impact on health.";
                break;
            case 'prevention':
                focusPrompt = "Focus on prevention strategies and long-term health protection measures.";
                break;
            default:
                focusPrompt = "Provide balanced insights covering recommendations, risks, and prevention.";
        }

        const prompt = `
You are a health expert providing focused insights on air quality health risks.

USER PROFILE:
- Age: ${user.age}
- Gender: ${user.gender}
- Health conditions: ${getHealthConditionsSummary(user)}
- Outdoor exposure: ${user.outdoorExposure}

ENVIRONMENTAL DATA:
- AQI: ${environmentalData.aqi}
- PM2.5: ${environmentalData.pm25} μg/m³
- PM10: ${environmentalData.pm10} μg/m³

FOCUS: ${focusPrompt}

Provide 3-5 specific, actionable insights in JSON format:
{
  "insights": [
    "insight 1",
    "insight 2",
    "insight 3"
  ]
}

Respond ONLY with the JSON object.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
        const aiResponse = JSON.parse(cleanText);

        return aiResponse.insights || [];

    } catch (error) {
        console.error("Error generating focused AI insights:", error);
        // Return fallback insights
        return [
            "Monitor air quality levels regularly throughout the day",
            "Consider adjusting outdoor activities based on current conditions",
            "Keep windows closed during high pollution periods"
        ];
    }
}

// Check profile completeness
exports.checkProfileCompleteness = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const requiredFields = ['age', 'gender', 'outdoorExposure'];
        const missingFields = requiredFields.filter(field => !user[field]);
        const isComplete = missingFields.length === 0;

        return res.status(200).json({
            success: true,
            isComplete,
            missingFields,
            requiredFields: {
                age: "Your age (required for risk calculation)",
                gender: "Gender (male/female/other/prefer_not_to_say)",
                outdoorExposure: "Outdoor exposure level (low/moderate/high)"
            },
            completionPercentage: Math.round(((requiredFields.length - missingFields.length) / requiredFields.length) * 100)
        });

    } catch (error) {
        console.error("Error checking profile completeness:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Validate assessment data
exports.validateAssessmentData = async (req, res, next) => {
    try {
        const { aqi, pm25, pm10, location } = req.body;

        const validation = validateEnvironmentalData({ aqi, pm25, pm10, location });

        return res.status(200).json({
            success: true,
            validation
        });

    } catch (error) {
        console.error("Error validating assessment data:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Helper function to validate environmental data
function validateEnvironmentalData(data) {
    const errors = [];
    const warnings = [];

    // Validate AQI
    if (!data.aqi || data.aqi < 0 || data.aqi > 500) {
        errors.push('AQI must be between 0 and 500');
    }

    // Validate PM2.5
    if (!data.pm25 || data.pm25 < 0) {
        errors.push('PM2.5 must be a positive number');
    } else if (data.pm25 > 500) {
        warnings.push('PM2.5 value seems unusually high - please verify');
    }

    // Validate PM10
    if (!data.pm10 || data.pm10 < 0) {
        errors.push('PM10 must be a positive number');
    } else if (data.pm10 > 600) {
        warnings.push('PM10 value seems unusually high - please verify');
    }

    // Validate PM relationship
    if (data.pm25 && data.pm10 && data.pm25 > data.pm10) {
        warnings.push('PM2.5 is typically lower than PM10 - please verify your readings');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        severity: data.aqi ? getAQISeverity(data.aqi) : 'unknown'
    };
}

// Get AQI information
exports.getAQIInfo = async (req, res, next) => {
    try {
        const aqi = parseInt(req.params.aqi);

        if (isNaN(aqi) || aqi < 0 || aqi > 500) {
            return res.status(400).json({
                success: false,
                message: "AQI must be a number between 0 and 500"
            });
        }

        const aqiInfo = getAQIInformation(aqi);

        return res.status(200).json({
            success: true,
            aqi,
            ...aqiInfo
        });

    } catch (error) {
        console.error("Error getting AQI info:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Helper function to get AQI information
function getAQIInformation(aqi) {
    let level, description, healthImplications, recommendations;

    if (aqi <= 50) {
        level = 'Good';
        description = 'Air quality is satisfactory';
        healthImplications = 'Air quality poses little or no risk';
        recommendations = ['Normal outdoor activities are safe'];
    } else if (aqi <= 100) {
        level = 'Moderate';
        description = 'Air quality is acceptable';
        healthImplications = 'May cause minor issues for sensitive individuals';
        recommendations = ['Sensitive individuals should consider limiting prolonged outdoor exertion'];
    } else if (aqi <= 150) {
        level = 'Unhealthy for Sensitive Groups';
        description = 'Air quality may affect sensitive individuals';
        healthImplications = 'Sensitive groups may experience minor to moderate symptoms';
        recommendations = ['Sensitive individuals should limit outdoor activities'];
    } else if (aqi <= 200) {
        level = 'Unhealthy';
        description = 'Air quality affects everyone';
        healthImplications = 'Everyone may experience health effects';
        recommendations = ['Everyone should limit outdoor activities'];
    } else if (aqi <= 300) {
        level = 'Very Unhealthy';
        description = 'Air quality is hazardous';
        healthImplications = 'Health alert: everyone may experience serious health effects';
        recommendations = ['Everyone should avoid outdoor activities'];
    } else {
        level = 'Hazardous';
        description = 'Emergency conditions';
        healthImplications = 'Health warnings of emergency conditions';
        recommendations = ['Everyone should avoid all outdoor activities'];
    }

    return {
        level,
        description,
        healthImplications,
        recommendations,
        color: getAQIColor(aqi)
    };
}

// Helper function to get AQI severity
function getAQISeverity(aqi) {
    if (aqi <= 50) return 'good';
    if (aqi <= 100) return 'moderate';
    if (aqi <= 150) return 'unhealthy_sensitive';
    if (aqi <= 200) return 'unhealthy';
    if (aqi <= 300) return 'very_unhealthy';
    return 'hazardous';
}

// Helper function to get AQI color
function getAQIColor(aqi) {
    if (aqi <= 50) return '#00e400';      // Green
    if (aqi <= 100) return '#ffff00';     // Yellow
    if (aqi <= 150) return '#ff7e00';     // Orange
    if (aqi <= 200) return '#ff0000';     // Red
    if (aqi <= 300) return '#8f3f97';     // Purple
    return '#7e0023';                     // Maroon
}

// Check if reassessment is needed
exports.checkReassessmentNeeded = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { currentAqi, currentPm25, currentPm10 } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const reassessmentCheck = checkIfReassessmentNeeded(
            user.lastAssessment,
            { aqi: currentAqi, pm25: currentPm25, pm10: currentPm10 }
        );

        return res.status(200).json({
            success: true,
            ...reassessmentCheck,
            lastAssessmentDate: user.lastAssessment?.assessedAt || null
        });

    } catch (error) {
        console.error("Error checking reassessment need:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Helper function to check if reassessment is needed
function checkIfReassessmentNeeded(lastAssessment, currentEnvironmentalData) {
    if (!lastAssessment) {
        return { 
            shouldReassess: true, 
            reason: 'No previous assessment found',
            urgency: 'normal'
        };
    }

    const hoursSinceAssessment = (new Date() - new Date(lastAssessment.assessedAt)) / (1000 * 60 * 60);

    // Suggest reassessment if more than 12 hours old
    if (hoursSinceAssessment > 12) {
        return { 
            shouldReassess: true, 
            reason: 'Assessment is over 12 hours old',
            urgency: 'normal'
        };
    }

    // Check for significant environmental changes
    if (currentEnvironmentalData && currentEnvironmentalData.aqi) {
        const aqiDiff = Math.abs(currentEnvironmentalData.aqi - lastAssessment.aqi);
        if (aqiDiff > 50) {
            return { 
                shouldReassess: true, 
                reason: 'Air quality has changed significantly',
                urgency: 'high',
                aqiChange: aqiDiff
            };
        }
    }

    return { 
        shouldReassess: false, 
        reason: 'Recent assessment is still valid',
        urgency: 'none',
        hoursSinceLastAssessment: Math.round(hoursSinceAssessment)
    };
}

// Helper function to get health conditions summary
function getHealthConditionsSummary(user) {
    const conditions = [];
    if (user.isPregnant) conditions.push('Pregnant');
    if (user.isSmoker) conditions.push('Smoker');
    if (user.hasAsthma) conditions.push('Asthma');
    if (user.hasHeartDisease) conditions.push('Heart Disease');
    if (user.hasRespiratoryIssues) conditions.push('Respiratory Issues');
    
    return conditions.length > 0 ? conditions.join(', ') : 'None reported';
}