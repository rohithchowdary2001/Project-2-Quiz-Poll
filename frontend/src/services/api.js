import axios from 'axios';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle different error scenarios
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
          
        case 403:
          // Forbidden
          console.error('Access denied. You do not have permission to perform this action.');
          break;
          
        case 404:
          // Not found
          console.error('Resource not found.');
          break;
          
        case 422:
          // Validation error
          console.error('Validation error:', data.details || data.message);
          break;
          
        case 429:
          // Too many requests
          console.error('Too many requests. Please try again later.');
          break;
          
        case 500:
          // Internal server error
          console.error('Server error. Please try again later.');
          break;
          
        default:
          // Other errors
          console.error('API Error:', data.message || 'An error occurred');
      }
    } else if (error.request) {
      // Network error
      console.error('Network error. Please check your connection.');
    } else {
      // Other errors
      console.error('An unexpected error occurred:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Authentication
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    verify: '/auth/verify',
    profile: '/auth/profile',
    changePassword: '/auth/change-password',
  },
  
  // Users
  users: {
    list: '/users',
    get: (id) => `/users/${id}`,
    update: (id) => `/users/${id}`,
    delete: (id) => `/users/${id}`,
    updateRole: (id) => `/users/${id}/role`,
    professors: '/users/professors',
    students: '/users/students',
    stats: '/users/stats',
    activity: (id) => `/users/${id}/activity`,
  },
  
  // Classes
  classes: {
    list: '/classes',
    get: (id) => `/classes/${id}`,
    create: '/classes',
    update: (id) => `/classes/${id}`,
    delete: (id) => `/classes/${id}`,
    students: (id) => `/classes/${id}/students`,
    enrollStudent: (id) => `/classes/${id}/students`,
    removeStudent: (id, studentId) => `/classes/${id}/students/${studentId}`,
    stats: (id) => `/classes/${id}/stats`,
  },
  
  // Quizzes
  quizzes: {
    list: '/quizzes',
    get: (id) => `/quizzes/${id}`,
    create: '/quizzes',
    update: (id) => `/quizzes/${id}`,
    delete: (id) => `/quizzes/${id}`,
    results: (id) => `/quizzes/${id}/results`,
    fromTemplate: '/quizzes/from-template',
  },
  
  // Submissions
  submissions: {
    start: '/submissions/start',
    answer: '/submissions/answer',
    complete: '/submissions/complete',
    mySubmissions: '/submissions/my-submissions',
    get: (id) => `/submissions/${id}`,
    pollResults: (quizId) => `/submissions/poll-results/${quizId}`,
  },
  
  // Admin
  admin: {
    dashboard: '/admin/dashboard',
    auditLogs: '/admin/audit-logs',
    analytics: '/admin/analytics',
    export: '/admin/export',
    health: '/admin/health',
    settings: '/admin/settings',
    cleanup: '/admin/cleanup',
  },
};

// Utility functions
export const apiUtils = {
  // Format query parameters
  formatParams: (params) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, value);
      }
    });
    return searchParams.toString();
  },
  
  // Handle file download
  downloadFile: async (url, filename) => {
    try {
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
      // toast.error('Failed to download file'); // Removed toast
    }
  },
  
  // Upload file
  uploadFile: async (url, file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Export as both default and named export
export { api };
export default api; 