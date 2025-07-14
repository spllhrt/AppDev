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

// 🔹 1. Create Bulletin (admin) with multiple images
export const createBulletin = async (formData) => {
  try {
    const response = await apiClient.post("/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Accept: "application/json",
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    const err = error.response?.data || {
      message: "Failed to create bulletin",
    };
    throw err;
  }
};

// 🔹 2. Get all bulletins (any logged-in user)
export const getAllBulletins = async () => {
  try {
    const response = await apiClient.get("/");
    return response.data;
  } catch (error) {
    const err = error.response?.data || {
      message: "Failed to fetch bulletins",
    };
    throw err;
  }
};

// 🔹 3. Get one bulletin by ID
export const getBulletinById = async (bulletinId) => {
  try {
    const response = await apiClient.get(`/${bulletinId}`);
    return response.data;
  } catch (error) {
    const err = error.response?.data || {
      message: "Failed to fetch bulletin",
    };
    throw err;
  }
};

// 🔹 4. Toggle reaction (upvote/downvote)
export const toggleReaction = async (bulletinId, reactionType) => {
  try {
    const response = await apiClient.patch(`/${bulletinId}/reactions`, { type: reactionType }, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    const err = error.response?.data || {
      message: "Failed to update reaction",
    };
    throw err;
  }
};

// 🔹 5. Add comment to bulletin
export const addComment = async (bulletinId, commentText) => {
  try {
    const response = await apiClient.post(
      `/bulletins/${bulletinId}/comments`,
      { text: commentText },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      }
    );
    return response.data;
  } catch (error) {
    const err = error.response?.data || {
      message: "Failed to add comment",
    };
    throw err;
  }
};

// 🔹 6. Delete bulletin (admin)
export const deleteBulletin = async (bulletinId) => {
  try {
    const response = await apiClient.delete(`/${bulletinId}`);
    return response.data;
  } catch (error) {
    const err = error.response?.data || {
      message: "Failed to delete bulletin",
    };
    throw err;
  }
};

export const updateBulletin = async (bulletinId, formData) => {
  try {
    const response = await apiClient.put(`/${bulletinId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Accept: "application/json",
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    const err = error.response?.data || {
      message: "Failed to update bulletin",
    };
    throw err;
  }
};

export default apiClient;
