// ../../api/pollutionSource.js
import axios from "axios";
import { getToken } from "../utils/secureStorage";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig.extra.API_URL;

const pollutionApiClient = axios.create({
  baseURL: API_URL,
});

// Add auth interceptor
pollutionApiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Classify pollution source by location and pollutant data
 * @param {{ lat: number, lon: number, pollutants: { pm2_5: number, no2?: number, so2?: number } }} data
 * @returns {Promise<{ predicted_source: string, confidence: number }>}
 */
export const classifyPollutionSource = async (data) => {
  try {
    console.log('Pollution API: Classifying pollution source with data:', data);

    const response = await pollutionApiClient.post("/classify", data, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 20000, // 20 seconds timeout
    });

    console.log('Pollution API: Classification result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Pollution API: Classification failed:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      requestData: data,
    });

    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || 'Failed to classify pollution source',
        status: error.response.status,
        response: error.response,
      };
    } else if (error.request) {
      throw {
        message: 'Network error - please check your internet connection',
        status: 'NETWORK_ERROR',
      };
    } else {
      throw {
        message: error.message || 'Failed to classify pollution source',
        status: 'UNKNOWN_ERROR',
      };
    }
  }
};

/**
 * Admin: Fetch pollution classification logs
 * @param {{ startDate?: string, endDate?: string, sourceType?: string }} [params]
 * @returns {Promise<{ success: boolean, count: number, data: object[] }>}
 */
export const getPollutionClassificationLogs = async (params = {}) => {
  try {
    const response = await pollutionApiClient.get("/pollution-sources", {
      params,
      headers: {
        Accept: "application/json",
      },
    });

    console.log("Pollution API: Retrieved logs:", response.data);
    return response.data;
  } catch (error) {
    console.error("Pollution API: Failed to fetch logs:", error);
    throw {
      message: error?.response?.data?.message || "Failed to fetch classification logs",
      status: error?.response?.status || "UNKNOWN",
    };
  }
};

export default pollutionApiClient;
