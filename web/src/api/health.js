// Updated health.js API client to match backend routes
import axios from "axios";
import { getToken } from "../utils/secureStorage";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig.extra.API_URL;

const healthApiClient = axios.create({
  baseURL: API_URL,
});

// Add auth interceptor
healthApiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get user's health profile
export const getHealthProfile = async () => {
  try {
    console.log('Health API: Fetching health profile from:', `${API_URL}/profile`);
    
    const response = await healthApiClient.get("/profile");
    
    console.log('Health API: Profile fetch successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Health API: Profile fetch failed:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });
    
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || 'Failed to fetch health profile',
        status: error.response.status,
        response: error.response
      };
    } else if (error.request) {
      throw {
        message: 'Network error - please check your internet connection',
        status: 'NETWORK_ERROR'
      };
    } else {
      throw {
        message: error.message || 'Failed to fetch health profile',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

// Update user's health profile
export const updateHealthProfile = async (healthData) => {
  try {
    console.log('Health API: Updating health profile:', healthData);
    
    const response = await healthApiClient.put("/profile", healthData, {
      headers: { 
        "Content-Type": "application/json",
        'Accept': 'application/json',
      },
      timeout: 15000,
    });
    
    console.log('Health API: Profile update successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Health API: Profile update failed:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      requestData: healthData,
    });
    
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || 'Failed to update health profile',
        status: error.response.status,
        missingFields: errorData?.missingFields || [],
        requiredFields: errorData?.requiredFields || {},
        response: error.response
      };
    } else if (error.request) {
      throw {
        message: 'Network error - please check your internet connection',
        status: 'NETWORK_ERROR'
      };
    } else {
      throw {
        message: error.message || 'Failed to update health profile',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

// Create AI-powered health risk assessment
export const createHealthRiskAssessment = async (assessmentData) => {
  try {
    console.log('Health API: Creating AI-powered risk assessment:', assessmentData);
    
    const response = await healthApiClient.post("/assessment", assessmentData, {
      headers: { 
        "Content-Type": "application/json",
        'Accept': 'application/json',
      },
      timeout: 45000,
    });
    
    console.log('Health API: AI risk assessment successful:', {
      riskScore: response.data.assessment?.riskScore,
      riskLevel: response.data.assessment?.riskLevel,
      generatedBy: response.data.assessment?.generatedBy,
      hasInsights: !!response.data.assessment?.insights,
      recommendationsCount: response.data.assessment?.recommendations?.length || 0
    });
    
    return response.data;
  } catch (error) {
    console.error('Health API: AI risk assessment failed:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      requestData: assessmentData,
    });
    
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || 'Failed to create AI risk assessment',
        status: error.response.status,
        missingFields: errorData?.missingFields || [],
        requiredFields: errorData?.requiredFields || {},
        isAIError: errorData?.message?.includes('AI') || errorData?.message?.includes('assessment service'),
        response: error.response
      };
    } else if (error.request) {
      throw {
        message: 'Network error - please check your internet connection',
        status: 'NETWORK_ERROR'
      };
    } else {
      throw {
        message: error.message || 'Failed to create AI risk assessment',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

// Get latest health risk assessment
export const getLatestAssessment = async () => {
  try {
    console.log('Health API: Fetching latest assessment from:', `${API_URL}/assessment/latest`);
    
    const response = await healthApiClient.get("/assessment/latest");
    
    console.log('Health API: Latest assessment fetch successful:', {
      hasAssessment: !!response.data.assessment,
      riskScore: response.data.assessment?.riskScore,
      riskLevel: response.data.assessment?.riskLevel,
      generatedBy: response.data.assessment?.generatedBy,
      hasInsights: !!response.data.assessment?.insights,
      assessmentDate: response.data.assessment?.assessedAt
    });
    
    return response.data;
  } catch (error) {
    // Handle 404 as a normal case (no previous assessment found)
    if (error.response?.status === 404) {
      console.log('Health API: No previous assessment found (this is normal for new users)');
      return {
        success: false,
        message: 'No previous assessment found',
        assessment: null
      };
    }
    
    // Log other errors as actual errors
    console.error('Health API: Latest assessment fetch failed:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });
    
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || 'Failed to fetch latest assessment',
        status: error.response.status,
        response: error.response
      };
    } else if (error.request) {
      throw {
        message: 'Network error - please check your internet connection',
        status: 'NETWORK_ERROR'
      };
    } else {
      throw {
        message: error.message || 'Failed to fetch latest assessment',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

// Get AI assessment history
export const getAssessmentHistory = async (limit = 10) => {
  try {
    console.log('Health API: Fetching assessment history');
    
    const response = await healthApiClient.get(`/assessment/history?limit=${limit}`);
    
    console.log('Health API: Assessment history fetch successful:', {
      count: response.data.assessments?.length || 0
    });
    
    return response.data;
  } catch (error) {
    console.error('Health API: Assessment history fetch failed:', error);
    
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || 'Failed to fetch assessment history',
        status: error.response.status,
        response: error.response
      };
    } else if (error.request) {
      throw {
        message: 'Network error - please check your internet connection',
        status: 'NETWORK_ERROR'
      };
    } else {
      throw {
        message: error.message || 'Failed to fetch assessment history',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

// Request specific AI insights
export const getAIInsights = async (assessmentData, focusArea = null) => {
  try {
    console.log('Health API: Requesting AI insights:', { focusArea });
    
    const payload = {
      ...assessmentData,
      focusArea
    };
    
    const response = await healthApiClient.post("/ai-insights", payload, {
      headers: { 
        "Content-Type": "application/json",
        'Accept': 'application/json',
      },
      timeout: 30000,
    });
    
    console.log('Health API: AI insights successful');
    return response.data;
  } catch (error) {
    console.error('Health API: AI insights failed:', error);
    
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || 'Failed to get AI insights',
        status: error.response.status,
        response: error.response
      };
    } else if (error.request) {
      throw {
        message: 'Network error - please check your internet connection',
        status: 'NETWORK_ERROR'
      };
    } else {
      throw {
        message: error.message || 'Failed to get AI insights',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

// NEW: Check profile completeness (matches backend route)
export const checkProfileCompleteness = async () => {
  try {
    console.log('Health API: Checking profile completeness');
    
    const response = await healthApiClient.get("/profile/completeness");
    
    console.log('Health API: Profile completeness check successful:', {
      isComplete: response.data.isComplete,
      missingFieldsCount: response.data.missingFields?.length || 0
    });
    
    return response.data;
  } catch (error) {
    console.error('Health API: Profile completeness check failed:', error);
    
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || 'Failed to check profile completeness',
        status: error.response.status,
        response: error.response
      };
    } else if (error.request) {
      throw {
        message: 'Network error - please check your internet connection',
        status: 'NETWORK_ERROR'
      };
    } else {
      throw {
        message: error.message || 'Failed to check profile completeness',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

// NEW: Validate assessment data on server (matches backend route)
export const validateAssessmentDataOnServer = async (assessmentData) => {
  try {
    console.log('Health API: Validating assessment data on server');
    
    const response = await healthApiClient.post("/validate-assessment", assessmentData, {
      headers: { 
        "Content-Type": "application/json",
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    
    console.log('Health API: Server validation successful:', {
      isValid: response.data.validation?.isValid,
      hasWarnings: response.data.validation?.warnings?.length > 0
    });
    
    return response.data;
  } catch (error) {
    console.error('Health API: Server validation failed:', error);
    
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || 'Failed to validate assessment data',
        status: error.response.status,
        response: error.response
      };
    } else if (error.request) {
      throw {
        message: 'Network error - please check your internet connection',
        status: 'NETWORK_ERROR'
      };
    } else {
      throw {
        message: error.message || 'Failed to validate assessment data',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

// NEW: Get AQI information (matches backend route)
export const getAQIInfo = async (aqi) => {
  try {
    console.log('Health API: Getting AQI info for:', aqi);
    
    const response = await healthApiClient.get(`/aqi-info/${aqi}`);
    
    console.log('Health API: AQI info fetch successful:', {
      aqi: response.data.aqi,
      level: response.data.level
    });
    
    return response.data;
  } catch (error) {
    console.error('Health API: AQI info fetch failed:', error);
    
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || 'Failed to get AQI information',
        status: error.response.status,
        response: error.response
      };
    } else if (error.request) {
      throw {
        message: 'Network error - please check your internet connection',
        status: 'NETWORK_ERROR'
      };
    } else {
      throw {
        message: error.message || 'Failed to get AQI information',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

// NEW: Check if reassessment is needed (matches backend route)
export const checkReassessmentNeeded = async (currentEnvironmentalData) => {
  try {
    console.log('Health API: Checking if reassessment is needed');
    
    const response = await healthApiClient.post("/reassessment-check", currentEnvironmentalData, {
      headers: { 
        "Content-Type": "application/json",
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    
    console.log('Health API: Reassessment check successful:', {
      shouldReassess: response.data.shouldReassess,
      reason: response.data.reason
    });
    
    return response.data;
  } catch (error) {
    console.error('Health API: Reassessment check failed:', error);
    
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || 'Failed to check reassessment need',
        status: error.response.status,
        response: error.response
      };
    } else if (error.request) {
      throw {
        message: 'Network error - please check your internet connection',
        status: 'NETWORK_ERROR'
      };
    } else {
      throw {
        message: error.message || 'Failed to check reassessment need',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

// Helper function to check if health profile is complete (updated to use new endpoint)
export const checkHealthProfileComplete = async () => {
  try {
    const profileData = await checkProfileCompleteness();
    return {
      isComplete: profileData.isComplete,
      missingFields: profileData.missingFields || [],
      profile: profileData.healthProfile,
      completionPercentage: profileData.completionPercentage
    };
  } catch (error) {
    console.error('Health API: Profile completeness check failed:', error);
    throw error;
  }
};

// Client-side validation for assessment data (kept as fallback)
export const validateAssessmentData = (assessmentData) => {
  const errors = [];
  const warnings = [];
  
  // Validate required environmental data
  if (!assessmentData.aqi || assessmentData.aqi < 0 || assessmentData.aqi > 500) {
    errors.push('AQI must be between 0 and 500');
  }
  
  if (!assessmentData.pm25 || assessmentData.pm25 < 0) {
    errors.push('PM2.5 must be a positive number');
  } else if (assessmentData.pm25 > 500) {
    warnings.push('PM2.5 value seems unusually high - please verify');
  }
  
  if (!assessmentData.pm10 || assessmentData.pm10 < 0) {
    errors.push('PM10 must be a positive number');
  } else if (assessmentData.pm10 > 600) {
    warnings.push('PM10 value seems unusually high - please verify');
  }
  
  // Validate PM relationship (PM2.5 should typically be less than PM10)
  if (assessmentData.pm25 && assessmentData.pm10 && assessmentData.pm25 > assessmentData.pm10) {
    warnings.push('PM2.5 is typically lower than PM10 - please verify your readings');
  }
  
  // Validate location if provided
  if (assessmentData.location && typeof assessmentData.location !== 'string') {
    errors.push('Location must be a string');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    severity: assessmentData.aqi ? getAQISeverity(assessmentData.aqi) : 'unknown'
  };
};

// Helper function to get AQI severity level
export const getAQISeverity = (aqi) => {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'unhealthy_sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'very_unhealthy';
  return 'hazardous';
};

// Helper function to format health profile data
export const formatHealthProfileData = (formData) => {
  return {
    age: formData.age ? parseInt(formData.age) : undefined,
    gender: formData.gender || undefined,
    isPregnant: formData.isPregnant === true || formData.isPregnant === 'true',
    isSmoker: formData.isSmoker === true || formData.isSmoker === 'true',
    hasAsthma: formData.hasAsthma === true || formData.hasAsthma === 'true',
    hasHeartDisease: formData.hasHeartDisease === true || formData.hasHeartDisease === 'true',
    hasRespiratoryIssues: formData.hasRespiratoryIssues === true || formData.hasRespiratoryIssues === 'true',
    outdoorExposure: formData.outdoorExposure || undefined,
  };
};

// Helper function to format assessment data
export const formatAssessmentData = (formData) => {
  return {
    aqi: parseFloat(formData.aqi),
    pm25: parseFloat(formData.pm25),
    pm10: parseFloat(formData.pm10),
    location: formData.location || undefined,
  };
};

// Helper function to parse AI assessment response
export const parseAIAssessment = (assessmentResponse) => {
  const assessment = assessmentResponse.assessment;
  
  return {
    // Core assessment data
    riskScore: assessment.riskScore,
    riskLevel: assessment.riskLevel,
    riskLevelText: formatRiskLevel(assessment.riskLevel),
    
    // Breakdown
    breakdown: assessment.breakdown || {},
    
    // Environmental data
    environmentalData: assessment.environmentalData || {},
    
    // AI-specific data
    recommendations: assessment.recommendations || [],
    insights: assessment.insights || [],
    generatedBy: assessment.generatedBy || 'Unknown',
    isAIGenerated: assessment.generatedBy?.includes('AI') || assessment.generatedBy?.includes('Gemini'),
    
    // Metadata
    assessedAt: new Date(assessment.assessedAt),
    location: assessment.location,
    
    // Helper methods
    getTopRecommendations: (count = 3) => assessment.recommendations?.slice(0, count) || [],
    getTopInsights: (count = 2) => assessment.insights?.slice(0, count) || [],
    getRiskColor: () => getRiskLevelColor(assessment.riskLevel),
    getRiskIcon: () => getRiskLevelIcon(assessment.riskLevel)
  };
};

// Helper function to format risk level for display
export const formatRiskLevel = (riskLevel) => {
  const levels = {
    'low': 'Low Risk',
    'moderate': 'Moderate Risk',
    'high': 'High Risk',
    'very_high': 'Very High Risk'
  };
  return levels[riskLevel] || 'Unknown Risk';
};

// Helper function to get risk level color
export const getRiskLevelColor = (riskLevel) => {
  const colors = {
    'low': '#4CAF50',      // Green
    'moderate': '#FF9800',  // Orange
    'high': '#F44336',      // Red
    'very_high': '#9C27B0'  // Purple
  };
  return colors[riskLevel] || '#757575'; // Grey for unknown
};

// Helper function to get risk level icon
export const getRiskLevelIcon = (riskLevel) => {
  const icons = {
    'low': 'check-circle',
    'moderate': 'warning',
    'high': 'error',
    'very_high': 'dangerous'
  };
  return icons[riskLevel] || 'help';
};

// Helper function to check if assessment is recent
export const isAssessmentRecent = (assessmentDate, hoursThreshold = 24) => {
  const now = new Date();
  const assessment = new Date(assessmentDate);
  const hoursDiff = (now - assessment) / (1000 * 60 * 60);
  return hoursDiff <= hoursThreshold;
};

// Helper function to calculate assessment freshness
export const getAssessmentFreshness = (assessmentDate) => {
  const now = new Date();
  const assessment = new Date(assessmentDate);
  const hoursDiff = (now - assessment) / (1000 * 60 * 60);
  
  if (hoursDiff < 1) return 'Very Fresh';
  if (hoursDiff < 6) return 'Fresh';
  if (hoursDiff < 24) return 'Recent';
  if (hoursDiff < 72) return 'Outdated';
  return 'Very Outdated';
};

// Client-side function to suggest reassessment (kept as fallback)
export const shouldReassess = (lastAssessment, currentEnvironmentalData) => {
  if (!lastAssessment) return { should: true, reason: 'No previous assessment' };
  
  const hoursSinceAssessment = (new Date() - new Date(lastAssessment.assessedAt)) / (1000 * 60 * 60);
  
  // Suggest reassessment if more than 12 hours old
  if (hoursSinceAssessment > 12) {
    return { should: true, reason: 'Assessment is over 12 hours old' };
  }
  
  // Suggest reassessment if environmental conditions changed significantly
  if (currentEnvironmentalData) {
    const aqiDiff = Math.abs(currentEnvironmentalData.aqi - lastAssessment.aqi);
    if (aqiDiff > 50) {
      return { should: true, reason: 'Air quality has changed significantly' };
    }
  }
  
  return { should: false, reason: 'Recent assessment is still valid' };
};

export default healthApiClient;