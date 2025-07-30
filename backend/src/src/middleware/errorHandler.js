const config = require('../config/config');

class ErrorHandler {
    static handle(error, req, res, next) {
        // Log error for debugging
        console.error('Error occurred:', {
            message: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            timestamp: new Date().toISOString(),
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });

        // Default error response
        let statusCode = 500;
        let message = 'Internal server error';
        let errorType = 'InternalServerError';
        let details = null;

        // Handle specific error types
        if (error.name === 'ValidationError') {
            statusCode = 400;
            message = 'Validation failed';
            errorType = 'ValidationError';
            details = error.details || error.message;
        } else if (error.name === 'UnauthorizedError' || error.message.includes('jwt')) {
            statusCode = 401;
            message = 'Authentication failed';
            errorType = 'AuthenticationError';
        } else if (error.name === 'ForbiddenError') {
            statusCode = 403;
            message = 'Access denied';
            errorType = 'AuthorizationError';
        } else if (error.name === 'NotFoundError') {
            statusCode = 404;
            message = 'Resource not found';
            errorType = 'NotFoundError';
        } else if (error.name === 'ConflictError') {
            statusCode = 409;
            message = 'Resource conflict';
            errorType = 'ConflictError';
        } else if (error.name === 'TooManyRequestsError') {
            statusCode = 429;
            message = 'Too many requests';
            errorType = 'RateLimitError';
        } else if (error.code === 'ER_DUP_ENTRY') {
            statusCode = 409;
            message = 'Duplicate entry';
            errorType = 'DuplicateError';
            
            // Extract field name from MySQL error
            const match = error.message.match(/Duplicate entry '.*' for key '(\w+)'/);
            if (match) {
                const keyName = match[1];
                if (keyName.includes('email')) {
                    details = 'Email address already exists';
                } else if (keyName.includes('username')) {
                    details = 'Username already exists';
                } else if (keyName.includes('class_code')) {
                    details = 'Class code already exists';
                } else {
                    details = 'This value already exists';
                }
            }
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            statusCode = 400;
            message = 'Invalid reference';
            errorType = 'ReferenceError';
            details = 'Referenced resource does not exist';
        } else if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            statusCode = 400;
            message = 'Cannot delete';
            errorType = 'ReferenceError';
            details = 'This resource is referenced by other records';
        } else if (error.code === 'ER_BAD_NULL_ERROR') {
            statusCode = 400;
            message = 'Missing required field';
            errorType = 'ValidationError';
            details = 'Required field cannot be empty';
        } else if (error.code === 'ECONNREFUSED') {
            statusCode = 503;
            message = 'Service unavailable';
            errorType = 'ServiceUnavailableError';
            details = 'Database connection refused';
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            statusCode = 503;
            message = 'Service unavailable';
            errorType = 'ServiceUnavailableError';
            details = 'Database access denied';
        } else if (error.statusCode) {
            // Use provided status code if available
            statusCode = error.statusCode;
            message = error.message;
            errorType = error.name || 'Error';
        }

        // Create error response
        const errorResponse = {
            error: errorType,
            message: message,
            timestamp: new Date().toISOString(),
            path: req.path,
            method: req.method
        };

        // Add details if available
        if (details) {
            errorResponse.details = details;
        }

        // Add stack trace in development
        if (config.server.env === 'development') {
            errorResponse.stack = error.stack;
        }

        // Add request ID if available
        if (req.id) {
            errorResponse.requestId = req.id;
        }

        // Send error response
        res.status(statusCode).json(errorResponse);
    }

    // Create specific error types
    static createError(message, statusCode = 500, errorType = 'Error', details = null) {
        const error = new Error(message);
        error.statusCode = statusCode;
        error.name = errorType;
        if (details) {
            error.details = details;
        }
        return error;
    }

    static validationError(message, details = null) {
        return ErrorHandler.createError(message, 400, 'ValidationError', details);
    }

    static unauthorizedError(message = 'Authentication required') {
        return ErrorHandler.createError(message, 401, 'UnauthorizedError');
    }

    static forbiddenError(message = 'Access denied') {
        return ErrorHandler.createError(message, 403, 'ForbiddenError');
    }

    static notFoundError(message = 'Resource not found') {
        return ErrorHandler.createError(message, 404, 'NotFoundError');
    }

    static conflictError(message, details = null) {
        return ErrorHandler.createError(message, 409, 'ConflictError', details);
    }

    static tooManyRequestsError(message = 'Too many requests') {
        return ErrorHandler.createError(message, 429, 'TooManyRequestsError');
    }

    static internalServerError(message = 'Internal server error') {
        return ErrorHandler.createError(message, 500, 'InternalServerError');
    }

    static serviceUnavailableError(message = 'Service unavailable') {
        return ErrorHandler.createError(message, 503, 'ServiceUnavailableError');
    }

    // Async error wrapper
    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    // Validation helper
    static validateRequired(fields, body) {
        const missing = [];
        for (const field of fields) {
            if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
                missing.push(field);
            }
        }
        if (missing.length > 0) {
            throw ErrorHandler.validationError(
                'Missing required fields',
                `The following fields are required: ${missing.join(', ')}`
            );
        }
    }

    // Email validation
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw ErrorHandler.validationError('Invalid email format');
        }
    }

    // Password validation
    static validatePassword(password) {
        if (password.length < config.security.passwordMinLength) {
            throw ErrorHandler.validationError(
                'Password too short',
                `Password must be at least ${config.security.passwordMinLength} characters long`
            );
        }
    }

    // Numeric validation
    static validateNumeric(value, fieldName) {
        if (isNaN(value) || value < 0) {
            throw ErrorHandler.validationError(
                `Invalid ${fieldName}`,
                `${fieldName} must be a positive number`
            );
        }
    }

    // Date validation
    static validateDate(date, fieldName) {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            throw ErrorHandler.validationError(
                `Invalid ${fieldName}`,
                `${fieldName} must be a valid date`
            );
        }
        return dateObj;
    }

    // Future date validation
    static validateFutureDate(date, fieldName) {
        const dateObj = ErrorHandler.validateDate(date, fieldName);
        if (dateObj <= new Date()) {
            throw ErrorHandler.validationError(
                `Invalid ${fieldName}`,
                `${fieldName} must be in the future`
            );
        }
        return dateObj;
    }
}

module.exports = ErrorHandler; 