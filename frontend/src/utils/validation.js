// Validation utility functions

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateName = (name) => {
  // At least 2 characters, only letters and spaces
  const nameRegex = /^[a-zA-Z\s]{2,}$/;
  return nameRegex.test(name.trim());
};

export const validateQuizTitle = (title) => {
  return title && title.trim().length >= 3 && title.trim().length <= 100;
};

export const validateQuizDuration = (duration) => {
  return duration && duration >= 5 && duration <= 480; // 5 minutes to 8 hours
};

export const validateQuizQuestion = (question) => {
  return question && question.trim().length >= 5 && question.trim().length <= 500;
};

export const validateClassCode = (code) => {
  // 3-10 characters, letters and numbers only
  const codeRegex = /^[a-zA-Z0-9]{3,10}$/;
  return codeRegex.test(code);
};

export const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end;
};

export const validateFutureDate = (date) => {
  if (!date) return false;
  const selectedDate = new Date(date);
  const now = new Date();
  return selectedDate > now;
};

export const getPasswordStrength = (password) => {
  let strength = 0;
  let feedback = [];
  
  if (password.length >= 8) {
    strength += 1;
  } else {
    feedback.push('At least 8 characters');
  }
  
  if (/[a-z]/.test(password)) {
    strength += 1;
  } else {
    feedback.push('Include lowercase letters');
  }
  
  if (/[A-Z]/.test(password)) {
    strength += 1;
  } else {
    feedback.push('Include uppercase letters');
  }
  
  if (/\d/.test(password)) {
    strength += 1;
  } else {
    feedback.push('Include numbers');
  }
  
  if (/[@$!%*?&]/.test(password)) {
    strength += 1;
  } else {
    feedback.push('Include special characters');
  }
  
  const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  
  return {
    score: strength,
    level: strengthLevels[Math.min(strength, 4)],
    feedback: feedback
  };
};

export const sanitizeInput = (input) => {
  if (!input) return '';
  return input.trim().replace(/[<>]/g, '');
};

export const validateFileType = (file, allowedTypes) => {
  if (!file || !allowedTypes) return false;
  return allowedTypes.includes(file.type);
};

export const validateFileSize = (file, maxSizeInMB) => {
  if (!file) return false;
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}; 