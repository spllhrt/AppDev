// ../../api/health.js
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
    console.log('Health API: Fetching health profile from:', `${API_URL}/health/profile`);
    
    const response = await healthApiClient.get("/health/profile");
    
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
    
    const response = await healthApiClient.put("/health/profile", healthData, {
      headers: { 
        "Content-Type": "application/json",
        'Accept': 'application/json',
      },
      timeout: 15000, // 15 seconds timeout
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

// Create health risk assessment
export const createHealthRiskAssessment = async (assessmentData) => {
  try {
    console.log('Health API: Creating risk assessment:', assessmentData);
    
    const response = await healthApiClient.post("/health/assessment", assessmentData, {
      headers: { 
        "Content-Type": "application/json",
        'Accept': 'application/json',
      },
      timeout: 20000, // 20 seconds timeout for assessment calculation
    });
    
    console.log('Health API: Risk assessment successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Health API: Risk assessment failed:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      requestData: assessmentData,
    });
    
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || 'Failed to create risk assessment',
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
        message: error.message || 'Failed to create risk assessment',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

// Get latest health risk assessment
export const getLatestAssessment = async () => {
  try {
    console.log('Health API: Fetching latest assessment from:', `${API_URL}/health/assessment/latest`);
    
    const response = await healthApiClient.get("/health/assessment/latest");
    
    console.log('Health API: Latest assessment fetch successful:', response.data);
    return response.data;
  } catch (error) {
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

// Helper function to check if health profile is complete
export const checkHealthProfileComplete = async () => {
  try {
    const profileData = await getHealthProfile();
    return {
      isComplete: profileData.isComplete,
      missingFields: profileData.requiredFields || [],
      profile: profileData.healthProfile
    };
  } catch (error) {
    console.error('Health API: Profile completeness check failed:', error);
    throw error;
  }
};

// Batch health data validation before assessment
export const validateAssessmentData = (assessmentData) => {
  const errors = [];
  
  // Validate required environmental data
  if (!assessmentData.aqi || assessmentData.aqi < 0 || assessmentData.aqi > 500) {
    errors.push('AQI must be between 0 and 500');
  }
  
  if (!assessmentData.pm25 || assessmentData.pm25 < 0) {
    errors.push('PM2.5 must be a positive number');
  }
  
  if (!assessmentData.pm10 || assessmentData.pm10 < 0) {
    errors.push('PM10 must be a positive number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
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

export default healthApiClient;