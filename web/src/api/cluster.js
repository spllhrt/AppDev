// ../../api/cluster.js
import axios from "axios";
import { getToken } from "../utils/secureStorage";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig.extra.API_URL;
const clusterApiClient = axios.create({
  baseURL: API_URL,
});

clusterApiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get cluster statistics for admin dashboard
export const getClusterStats = async () => {
  try {
    const response = await clusterApiClient.get("/cluster-stats");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch cluster stats:", error);
    throw error.response?.data || { message: "Failed to fetch cluster stats" };
  }
};

export default clusterApiClient;
