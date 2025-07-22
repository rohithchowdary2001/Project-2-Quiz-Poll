// Application constants

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  PROFESSOR: 'professor',
  STUDENT: 'student'
};

// Quiz types
export const QUIZ_TYPES = {
  QUIZ: 'quiz',
  POLL: 'poll',
  SURVEY: 'survey'
};

// Question types
export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  TEXT: 'text',
  ESSAY: 'essay'
};

// Quiz status
export const QUIZ_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived'
};

// Submission status
export const SUBMISSION_STATUS = {
  STARTED: 'started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  TIMEOUT: 'timeout'
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    VERIFY: '/auth/verify',
    PROFILE: '/auth/profile'
  },
  USERS: '/users',
  CLASSES: '/classes',
  QUIZZES: '/quizzes',
  SUBMISSIONS: '/submissions',
  ADMIN: '/admin'
};

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language'
};

// Default values
export const DEFAULTS = {
  QUIZ_DURATION: 60, // minutes
  MAX_ATTEMPTS: 1,
  QUESTIONS_PER_PAGE: 10,
  ITEMS_PER_PAGE: 20,
  TIMEOUT_DURATION: 5000, // milliseconds
  DEBOUNCE_DELAY: 300 // milliseconds
};

// Validation rules
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
  QUIZ_TITLE_MIN_LENGTH: 3,
  QUIZ_TITLE_MAX_LENGTH: 100,
  QUESTION_MIN_LENGTH: 5,
  QUESTION_MAX_LENGTH: 500,
  CLASS_CODE_MIN_LENGTH: 3,
  CLASS_CODE_MAX_LENGTH: 10,
  MAX_FILE_SIZE_MB: 10
};

// Theme colors
export const THEME_COLORS = {
  PRIMARY: '#0d6efd',
  SUCCESS: '#198754',
  DANGER: '#dc3545',
  WARNING: '#ffc107',
  INFO: '#0dcaf0',
  SECONDARY: '#6c757d',
  LIGHT: '#f8f9fa',
  DARK: '#212529'
};

// Grade thresholds
export const GRADE_THRESHOLDS = {
  A: 90,
  B: 80,
  C: 70,
  D: 60,
  F: 0
};

// Date formats
export const DATE_FORMATS = {
  FULL: 'YYYY-MM-DD HH:mm:ss',
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss',
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY HH:mm'
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  LOGOUT_SUCCESS: 'Logout successful!',
  REGISTER_SUCCESS: 'Registration successful!',
  QUIZ_CREATED: 'Quiz created successfully!',
  QUIZ_UPDATED: 'Quiz updated successfully!',
  QUIZ_DELETED: 'Quiz deleted successfully!',
  SUBMISSION_COMPLETED: 'Quiz submitted successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  CLASS_CREATED: 'Class created successfully!',
  STUDENT_ENROLLED: 'Student enrolled successfully!'
};

// Loading states
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// File types
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  SPREADSHEETS: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
  ALL: ['*/*']
};

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  ADMIN: {
    BASE: '/admin',
    USERS: '/admin/users',
    ANALYTICS: '/admin/analytics',
    AUDIT_LOGS: '/admin/audit-logs'
  },
  PROFESSOR: {
    BASE: '/professor',
    CLASSES: '/professor/classes',
    QUIZZES: '/professor/quizzes',
    QUIZ_CREATE: '/professor/quizzes/create',
    QUIZ_EDIT: '/professor/quizzes/:id/edit',
    QUIZ_RESULTS: '/professor/quizzes/:id/results'
  },
  STUDENT: {
    BASE: '/student',
    QUIZZES: '/student/quizzes',
    QUIZ_TAKE: '/student/quizzes/:id/take',
    HISTORY: '/student/history'
  }
}; 