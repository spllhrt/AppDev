import axios from "axios";
import { storeToken, getToken, removeToken } from "../utils/secureStorage";
import { logout } from "../redux/authSlice"; // Import logout action
import Constants from "expo-constants";

const API_URL = Constants.expoConfig.extra.API_URL;
const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


export const registerUser = async (formData) => {
  try {
    console.log('API: Sending registration request to:', `${API_URL}/register`);
    
    // Enhanced logging for FormData debugging
    if (formData instanceof FormData) {
      console.log('API: FormData detected, contents:');
      // Note: We can't directly log FormData contents in React Native
      // But we can log that it's properly formatted
      console.log('API: FormData is properly formatted for multipart/form-data');
    }

    const response = await apiClient.post("/register", formData, {
      headers: { 
        "Content-Type": "multipart/form-data",
        // Explicitly set these headers for better compatibility
        'Accept': 'application/json',
      },
      // Add timeout for better error handling
      timeout: 30000, // 30 seconds timeout
    });

    console.log('API: Registration successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('API: Registration failed:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
      }
    });

    // Enhanced error handling to provide better error messages
    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data;
      throw {
        message: errorData?.message || errorData?.error || 'Registration failed',
        status: error.response.status,
        response: error.response
      };
    } else if (error.request) {
      // Request was made but no response
      console.error('API: No response received:', error.request);
      throw {
        message: 'Network error - please check your internet connection',
        status: 'NETWORK_ERROR'
      };
    } else {
      // Something else happened
      throw {
        message: error.message || 'Registration failed',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

export const loginUser = async ({ email, password }) => {
  try {
    const response = await apiClient.post("/login", { email, password });

    if (response.data.token) {
      await storeToken(response.data.token); 
    }

    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Login failed" };
  }
};

export const getUserProfile = async () => {
  try {
    const response = await apiClient.get("/me");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch profile" };
  }
};

export const updateUserProfile = async (data) => {
  try {
    const isFormData = data instanceof FormData;
    
    const headers = isFormData 
      ? { "Content-Type": "multipart/form-data" }
      : { "Content-Type": "application/json" };
    
    const response = await apiClient.put("/me/update", data, { headers });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Profile update failed" };
  }
};

export const updatePassword = async (oldPassword, newPassword) => {
  try {
    const response = await apiClient.put("/password/update", {
      oldPassword,
      password: newPassword,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Password update failed" };
  }
};

export const logoutUser = async (dispatch) => {
  try {
    await removeToken(); 
    dispatch(logout());
    
    return { message: "Logged out successfully" };
  } catch (error) {
    throw { message: "Logout failed" };
  }
};

export const getAllUsers = async () => {
  try {
    const response = await apiClient.get("/admin/users");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch users" };
  }
};

export const getUserDetails = async (userId) => {
  try {
    const response = await apiClient.get(`/admin/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return { user: null };
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const response = await apiClient.put(`/admin/user/${userId}`, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to update user" };
  }
};


export default apiClient;