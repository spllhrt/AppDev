// ../../api/historyApi.js
import apiClient from "./auth";

// Get all assessments for the logged-in user
export const getUserAssessments = async () => {
  try {
    console.log('API: Fetching user assessments from:', '/assessment/me');
    const response = await apiClient.get("/assessment/me");
    console.log('API: User assessments fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('API: Failed to fetch user assessments:', {
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

    // Enhanced error handling
    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data;
      throw {
        message: errorData?.message || errorData?.error || 'Failed to fetch assessments',
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
        message: error.message || 'Failed to fetch assessments',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

// Get single assessment by ID (owner or admin)
export const getAssessmentById = async (assessmentId) => {
  try {
    console.log('API: Fetching assessment with ID:', assessmentId);
    const response = await apiClient.get(`/assessment/${assessmentId}`);
    console.log('API: Assessment fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('API: Failed to fetch assessment:', {
      assessmentId,
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

    // Enhanced error handling
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || errorData?.error || 'Failed to fetch assessment',
        status: error.response.status,
        response: error.response
      };
    } else if (error.request) {
      console.error('API: No response received:', error.request);
      throw {
        message: 'Network error - please check your internet connection',
        status: 'NETWORK_ERROR'
      };
    } else {
      throw {
        message: error.message || 'Failed to fetch assessment',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

// Admin: Get all assessments
export const getAllAssessments = async () => {
  try {
    console.log('API: Fetching all assessments from:', '/admin/assessments');
    const response = await apiClient.get("/admin/assessments");
    console.log('API: All assessments fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('API: Failed to fetch all assessments:', {
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

    // Enhanced error handling
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || errorData?.error || 'Failed to fetch all assessments',
        status: error.response.status,
        response: error.response
      };
    } else if (error.request) {
      console.error('API: No response received:', error.request);
      throw {
        message: 'Network error - please check your internet connection',
        status: 'NETWORK_ERROR'
      };
    } else {
      throw {
        message: error.message || 'Failed to fetch all assessments',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

// Admin: Delete assessment by ID
export const deleteAssessment = async (assessmentId) => {
  try {
    console.log('API: Deleting assessment with ID:', assessmentId);
    const response = await apiClient.delete(`/admin/assessment/${assessmentId}`);
    console.log('API: Assessment deleted successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('API: Failed to delete assessment:', {
      assessmentId,
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

    // Enhanced error handling
    if (error.response) {
      const errorData = error.response.data;
      throw {
        message: errorData?.message || errorData?.error || 'Failed to delete assessment',
        status: error.response.status,
        response: error.response
      };
    } else if (error.request) {
      console.error('API: No response received:', error.request);
      throw {
        message: 'Network error - please check your internet connection',
        status: 'NETWORK_ERROR'
      };
    } else {
      throw {
        message: error.message || 'Failed to delete assessment',
        status: 'UNKNOWN_ERROR'
      };
    }
  }
};

export default {
  getUserAssessments,
  getAssessmentById,
  getAllAssessments,
  deleteAssessment,
};