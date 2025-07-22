import { api, endpoints } from './api';

const authService = {
  // Login user
  login: async (credentials) => {
    try {
      const response = await api.post(endpoints.auth.login, credentials);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Register user
  register: async (userData) => {
    try {
      const response = await api.post(endpoints.auth.register, userData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Logout user
  logout: async () => {
    try {
      await api.post(endpoints.auth.logout);
    } catch (error) {
      // Even if logout fails on server, we still want to clear local state
      console.error('Logout error:', error);
    }
  },

  // Verify token
  verifyToken: async () => {
    try {
      const response = await api.get(endpoints.auth.verify);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get(endpoints.auth.profile);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put(endpoints.auth.profile, profileData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      const response = await api.put(endpoints.auth.changePassword, passwordData);
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default authService; 