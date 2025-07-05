import { setItemAsync, getItemAsync, deleteItemAsync } from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "jwt_token"; // Key for SecureStore

// Store JWT token securely
export const storeToken = async (token) => {
  try {
    if (Platform.OS === 'web') {
      // Fallback for web platform
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await setItemAsync(TOKEN_KEY, token, {
        keychainAccessible: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
      });
    }
  } catch (error) {
    console.error("Error storing token:", error);
  }
};

// Retrieve JWT token
export const getToken = async () => {
  try {
    if (Platform.OS === 'web') {
      // Fallback for web platform
      return localStorage.getItem(TOKEN_KEY);
    } else {
      return await getItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.error("Error retrieving token:", error);
    return null;
  }
};

// Remove JWT token (for logout)
export const removeToken = async () => {
  try {
    if (Platform.OS === 'web') {
      // Fallback for web platform
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.error("Error removing token:", error);
  }
};