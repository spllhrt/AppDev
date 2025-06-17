import axios from "axios";
import { getToken } from "../utils/secureStorage";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig.extra.API_URL;
const apiClient = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// AQI Weather API Functions

/**
 * Store AQI Weather Snapshot
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @returns {Promise} API response
 */
export const storeAQIWeatherSnapshot = async (latitude, longitude) => {
  try {
    console.log('API: Storing AQI weather snapshot for coordinates:', { latitude, longitude });
    
    const response = await apiClient.post("/store-snapshot", {
      latitude,
      longitude
    });

    console.log('API: Snapshot stored successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('API: Failed to store snapshot:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    if (error.response) {
      throw {
        message: error.response.data?.error || error.response.data?.message || 'Failed to store snapshot',
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
        message: error.message || 'Failed to store snapshot',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

/**
 * Get user's AQI weather history
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Records per page (default: 10)
 * @param {string} params.sortBy - Sort field (default: 'date')
 * @param {string} params.sortOrder - Sort order 'asc' or 'desc' (default: 'desc')
 * @returns {Promise} API response with snapshots and pagination
 */
export const getUserHistory = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 10,
      sortBy: params.sortBy || 'date',
      sortOrder: params.sortOrder || 'desc'
    });

    const response = await apiClient.get(`/my-history?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('API: Failed to fetch user history:', error);
    throw error.response?.data || { message: "Failed to fetch user history" };
  }
};

/**
 * Get user's AQI weather statistics
 * @param {number} days - Number of days to include in stats (default: 7)
 * @returns {Promise} API response with statistics
 */
export const getUserStats = async (days = 7) => {
  try {
    const response = await apiClient.get(`/my-stats?days=${days}`);
    return response.data;
  } catch (error) {
    console.error('API: Failed to fetch user stats:', error);
    throw error.response?.data || { message: "Failed to fetch user statistics" };
  }
};

/**
 * Get specific snapshot by ID
 * @param {string} snapshotId - Snapshot ID
 * @returns {Promise} API response with snapshot details
 */
export const getSnapshotById = async (snapshotId) => {
  try {
    const response = await apiClient.get(`/snapshot/${snapshotId}`);
    return response.data;
  } catch (error) {
    console.error('API: Failed to fetch snapshot:', error);
    throw error.response?.data || { message: "Failed to fetch snapshot" };
  }
};

/**
 * Delete specific AQI weather snapshot
 * @param {string} snapshotId - Snapshot ID to delete
 * @returns {Promise} API response
 */
export const deleteAQIWeatherSnapshot = async (snapshotId) => {
  try {
    const response = await apiClient.delete(`/snapshot/${snapshotId}`);
    return response.data;
  } catch (error) {
    console.error('API: Failed to delete snapshot:', error);
    throw error.response?.data || { message: "Failed to delete snapshot" };
  }
};

// Admin API Functions

/**
 * Get all users' AQI weather data (Admin only)
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Records per page (default: 20)
 * @param {string} params.sortBy - Sort field (default: 'date')
 * @param {string} params.sortOrder - Sort order 'asc' or 'desc' (default: 'desc')
 * @returns {Promise} API response with all snapshots, pagination, and summary
 */
export const getAllUsersAQIWeatherData = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 20,
      sortBy: params.sortBy || 'date',
      sortOrder: params.sortOrder || 'desc'
    });

    const response = await apiClient.get(`/admin/all-data?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('API: Failed to fetch all users data:', error);
    throw error.response?.data || { message: "Failed to fetch all users AQI weather data" };
  }
};

/**
 * Get specific user's AQI weather data (Admin only)
 * @param {string} userId - User ID
 * @param {Object} params - Query parameters
 * @returns {Promise} API response with user's snapshots and pagination
 */
export const getUserAQIWeatherData = async (userId, params = {}) => {
  try {
    const queryParams = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 10,
      sortBy: params.sortBy || 'date',
      sortOrder: params.sortOrder || 'desc'
    });

    const response = await apiClient.get(`/admin/user/${userId}?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('API: Failed to fetch user AQI weather data:', error);
    throw error.response?.data || { message: "Failed to fetch user AQI weather data" };
  }
};

/**
 * Delete all AQI weather data for a specific user (Admin only)
 * @param {string} userId - User ID whose data to delete
 * @returns {Promise} API response
 */
export const deleteUserAQIWeatherData = async (userId) => {
  try {
    const response = await apiClient.delete(`/admin/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('API: Failed to delete user AQI weather data:', error);
    throw error.response?.data || { message: "Failed to delete user AQI weather data" };
  }
};

/**
 * Delete any snapshot by ID (Admin only)
 * @param {string} snapshotId - Snapshot ID to delete
 * @returns {Promise} API response
 */
export const deleteAnySnapshot = async (snapshotId) => {
  try {
    const response = await apiClient.delete(`/admin/snapshot/${snapshotId}`);
    return response.data;
  } catch (error) {
    console.error('API: Failed to delete snapshot:', error);
    throw error.response?.data || { message: "Failed to delete snapshot" };
  }
};

// Utility Functions

/**
 * Get weather code description
 * @param {number} code - Weather code from API
 * @returns {string} Human readable weather description
 */
export const getWeatherDescription = (code) => {
  const weatherCodes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snowfall',
    73: 'Moderate snowfall',
    75: 'Heavy snowfall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  
  return weatherCodes[code] || 'Unknown weather condition';
};

/**
 * Get AQI level description and color
 * @param {number} aqi - AQI value
 * @returns {Object} Object with level, description, and color
 */
export const getAQILevel = (aqi) => {
  if (aqi <= 50) {
    return {
      level: 'Good',
      description: 'Air quality is satisfactory',
      color: '#00e400',
      textColor: '#000000'
    };
  } else if (aqi <= 100) {
    return {
      level: 'Moderate',
      description: 'Air quality is acceptable',
      color: '#ffff00',
      textColor: '#000000'
    };
  } else if (aqi <= 150) {
    return {
      level: 'Unhealthy for Sensitive Groups',
      description: 'Sensitive people may experience minor issues',
      color: '#ff7e00',
      textColor: '#000000'
    };
  } else if (aqi <= 200) {
    return {
      level: 'Unhealthy',
      description: 'Everyone may experience health effects',
      color: '#ff0000',
      textColor: '#ffffff'
    };
  } else if (aqi <= 300) {
    return {
      level: 'Very Unhealthy',
      description: 'Health alert: everyone may experience serious effects',
      color: '#8f3f97',
      textColor: '#ffffff'
    };
  } else {
    return {
      level: 'Hazardous',
      description: 'Health warnings of emergency conditions',
      color: '#7e0023',
      textColor: '#ffffff'
    };
  }
};

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  return new Date(date).toLocaleString();
};

/**
 * Calculate distance between two coordinates
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

export default apiClient;