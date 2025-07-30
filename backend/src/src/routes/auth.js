const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const database = require('../config/database');
const config = require('../config/config');
const AuthMiddleware = require('../middleware/auth');
const ErrorHandler = require('../middleware/errorHandler');
const AuditLogger = require('../middleware/auditLogger');

class AuthController {
    // User registration
    static async register(req, res, next) {
        try {
            const { username, email, password, firstName, lastName } = req.body;

            // Validate required fields
            ErrorHandler.validateRequired(['username', 'email', 'password', 'firstName', 'lastName'], req.body);

            // Validate email format
            ErrorHandler.validateEmail(email);

            // Validate password strength
            ErrorHandler.validatePassword(password);

            // Check if user already exists
            const existingUser = await database.query(
                'SELECT id FROM users WHERE username = ? OR email = ?',
                [username, email]
            );

            if (existingUser.length > 0) {
                throw ErrorHandler.conflictError('User already exists', 'Username or email already taken');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

            // Determine role - first user is admin, rest are students
            const userCount = await database.count('users');
            const role = userCount === 0 ? 'admin' : 'student';

            // Create user
            const result = await database.insert('users', {
                username: username.toLowerCase(),
                email: email.toLowerCase(),
                password_hash: hashedPassword,
                first_name: firstName,
                last_name: lastName,
                role: role
            });

            // Log authentication event
            await AuditLogger.logAuthentication(
                result.insertId,
                'REGISTER',
                true,
                req.ip,
                req.get('User-Agent'),
                { role: role, isFirstUser: userCount === 0 }
            );

            // Generate JWT token
            const token = jwt.sign(
                { userId: result.insertId, role: role },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            res.status(201).json({
                message: 'User registered successfully',
                user: {
                    id: result.insertId,
                    username: username,
                    email: email,
                    firstName: firstName,
                    lastName: lastName,
                    role: role
                },
                token: token
            });

        } catch (error) {
            // Log failed registration
            await AuditLogger.logAuthentication(
                null,
                'REGISTER',
                false,
                req.ip,
                req.get('User-Agent'),
                { error: error.message }
            );
            next(error);
        }
    }

    // User login
    static async login(req, res, next) {
        try {
            const { username, password } = req.body;

            // Validate required fields
            ErrorHandler.validateRequired(['username', 'password'], req.body);

            // Find user by username or email
            const users = await database.query(
                'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = true',
                [username.toLowerCase(), username.toLowerCase()]
            );

            if (users.length === 0) {
                throw ErrorHandler.unauthorizedError('Invalid credentials');
            }

            const user = users[0];

            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                // Log failed login
                await AuditLogger.logAuthentication(
                    user.id,
                    'LOGIN',
                    false,
                    req.ip,
                    req.get('User-Agent'),
                    { reason: 'Invalid password' }
                );
                throw ErrorHandler.unauthorizedError('Invalid credentials');
            }

            // Update last login
            await database.update('users', 
                { last_login: new Date() }, 
                { id: user.id }
            );

            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id, role: user.role },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            // Log successful login
            await AuditLogger.logAuthentication(
                user.id,
                'LOGIN',
                true,
                req.ip,
                req.get('User-Agent'),
                { role: user.role }
            );

            res.json({
                message: 'Login successful',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                    lastLogin: user.last_login
                },
                token: token
            });

        } catch (error) {
            next(error);
        }
    }

    // Verify token and get user info
    static async verify(req, res, next) {
        try {
            const user = await database.findById('users', req.user.id);
            
            if (!user || !user.is_active) {
                throw ErrorHandler.unauthorizedError('User not found or inactive');
            }

            res.json({
                message: 'Token is valid',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                    lastLogin: user.last_login
                }
            });

        } catch (error) {
            next(error);
        }
    }

    // Logout (client-side token removal, but log the event)
    static async logout(req, res, next) {
        try {
            // Log logout event
            await AuditLogger.logAuthentication(
                req.user.id,
                'LOGOUT',
                true,
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                message: 'Logout successful'
            });

        } catch (error) {
            next(error);
        }
    }

    // Change password
    static async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;

            // Validate required fields
            ErrorHandler.validateRequired(['currentPassword', 'newPassword'], req.body);

            // Validate new password strength
            ErrorHandler.validatePassword(newPassword);

            // Get current user
            const user = await database.findById('users', req.user.id);
            if (!user) {
                throw ErrorHandler.notFoundError('User not found');
            }

            // Verify current password
            const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isValidPassword) {
                throw ErrorHandler.unauthorizedError('Current password is incorrect');
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, config.security.bcryptRounds);

            // Update password
            await database.update('users', 
                { password_hash: hashedPassword }, 
                { id: user.id }
            );

            // Log password change
            await AuditLogger.logUserAction(
                user.id,
                'PASSWORD_CHANGE',
                'users',
                user.id,
                null,
                { timestamp: new Date().toISOString() },
                req
            );

            res.json({
                message: 'Password changed successfully'
            });

        } catch (error) {
            next(error);
        }
    }

    // Reset password (admin only)
    static async resetPassword(req, res, next) {
        try {
            const { userId, newPassword } = req.body;

            // Validate required fields
            ErrorHandler.validateRequired(['userId', 'newPassword'], req.body);

            // Validate new password strength
            ErrorHandler.validatePassword(newPassword);

            // Get target user
            const user = await database.findById('users', userId);
            if (!user) {
                throw ErrorHandler.notFoundError('User not found');
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, config.security.bcryptRounds);

            // Update password
            await database.update('users', 
                { password_hash: hashedPassword }, 
                { id: userId }
            );

            // Log password reset
            await AuditLogger.logUserAction(
                req.user.id,
                'PASSWORD_RESET',
                'users',
                userId,
                null,
                { 
                    target_user: user.username,
                    timestamp: new Date().toISOString() 
                },
                req
            );

            res.json({
                message: 'Password reset successfully'
            });

        } catch (error) {
            next(error);
        }
    }

    // Get user profile
    static async getProfile(req, res, next) {
        try {
            const user = await database.findById('users', req.user.id);
            
            if (!user) {
                throw ErrorHandler.notFoundError('User not found');
            }

            res.json({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                    createdAt: user.created_at,
                    lastLogin: user.last_login
                }
            });

        } catch (error) {
            next(error);
        }
    }

    // Update user profile
    static async updateProfile(req, res, next) {
        try {
            const { firstName, lastName, email } = req.body;

            // Validate required fields
            ErrorHandler.validateRequired(['firstName', 'lastName', 'email'], req.body);

            // Validate email format
            ErrorHandler.validateEmail(email);

            // Check if email is already taken by another user
            const existingUser = await database.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email.toLowerCase(), req.user.id]
            );

            if (existingUser.length > 0) {
                throw ErrorHandler.conflictError('Email already taken');
            }

            // Get current user data for audit log
            const currentUser = await database.findById('users', req.user.id);

            // Update user profile
            await database.update('users', {
                first_name: firstName,
                last_name: lastName,
                email: email.toLowerCase()
            }, { id: req.user.id });

            // Log profile update
            await AuditLogger.logUserAction(
                req.user.id,
                'PROFILE_UPDATE',
                'users',
                req.user.id,
                {
                    first_name: currentUser.first_name,
                    last_name: currentUser.last_name,
                    email: currentUser.email
                },
                { 
                    first_name: firstName,
                    last_name: lastName,
                    email: email.toLowerCase()
                },
                req
            );

            res.json({
                message: 'Profile updated successfully',
                user: {
                    id: req.user.id,
                    username: req.user.username,
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    role: req.user.role
                }
            });

        } catch (error) {
            next(error);
        }
    }
}

// Authentication routes
router.post('/register', ErrorHandler.asyncHandler(AuthController.register));
router.post('/login', ErrorHandler.asyncHandler(AuthController.login));
router.post('/logout', AuthMiddleware.verifyToken, ErrorHandler.asyncHandler(AuthController.logout));
router.get('/verify', AuthMiddleware.verifyToken, ErrorHandler.asyncHandler(AuthController.verify));
router.post('/change-password', AuthMiddleware.verifyToken, ErrorHandler.asyncHandler(AuthController.changePassword));
router.post('/reset-password', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(AuthController.resetPassword));
router.get('/profile', AuthMiddleware.verifyToken, ErrorHandler.asyncHandler(AuthController.getProfile));
router.put('/profile', AuthMiddleware.verifyToken, ErrorHandler.asyncHandler(AuthController.updateProfile));

module.exports = router; 