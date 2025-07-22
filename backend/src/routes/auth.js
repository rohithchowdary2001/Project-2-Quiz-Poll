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
    // User login (includes admin login)
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
}

// Authentication route for login only
router.post('/login', ErrorHandler.asyncHandler(AuthController.login));

module.exports = router;