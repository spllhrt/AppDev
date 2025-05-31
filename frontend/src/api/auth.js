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
    const response = await apiClient.post("/register", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Registration failed" };
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