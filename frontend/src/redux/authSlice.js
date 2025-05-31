import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { storeToken, getToken, removeToken } from "../utils/secureStorage"; // Import SecureStore functions
import Constants from "expo-constants";

const API_URL = Constants.expoConfig.extra.API_URL;
const apiClient = axios.create({
  baseURL: API_URL,
});

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
};


const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;

      // Store token securely
      storeToken(action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;

      // Remove token from SecureStore
      removeToken();
    },
    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setTokenFromStorage: (state, action) => {
      state.token = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },
});

export const { setUser, logout, updateUser, setTokenFromStorage, updatePushToken } = authSlice.actions;
export default authSlice.reducer;