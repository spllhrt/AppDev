import axios from "axios";
import Constants from "expo-constants";
import { getToken } from "../utils/secureStorage";

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

// 🔹 1. Submit Pollution Report (user)
export const submitReport = async (formData) => {
  try {
    const response = await apiClient.post("/submit", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Accept: "application/json",
      },
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    const err = error.response?.data || {
      message: "Report submission failed",
    };
    throw err;
  }
};

// 🔹 2. Get My Reports (user)
export const getMyReports = async () => {
  try {
    const response = await apiClient.get("/my");
    return response.data;
  } catch (error) {
    const err = error.response?.data || {
      message: "Failed to fetch user reports",
    };
    throw err;
  }
};

// 🔹 3. Get All Reports (admin)
export const getAllReports = async () => {
  try {
    const response = await apiClient.get("/admin/all");
    return response.data;
  } catch (error) {
    const err = error.response?.data || {
      message: "Failed to fetch all reports",
    };
    throw err;
  }
};

// 🔹 4. Update Report (admin)
export const updateReport = async (reportId, updateData) => {
  try {
    const response = await apiClient.put(`/admin/update/${reportId}`, updateData, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;
  } catch (error) {
    const err = error.response?.data || {
      message: "Failed to update report",
    };
    throw err;
  }
};

export default apiClient;
