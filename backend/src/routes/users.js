const express = require('express');
const router = express.Router();

const database = require('../config/database');
const AuthMiddleware = require('../middleware/auth');
const ErrorHandler = require('../middleware/errorHandler');

class UserController {
    // Get all users (admin only)
    static async getAllUsers(req, res, next) {
        try {
            const { page = 1, limit = 10, role, search } = req.query;
            
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const offset = (pageNum - 1) * limitNum;
            
            let query = `
                SELECT id, username, email, first_name, last_name, role, 
                       created_at, last_login, is_active
                FROM users 
                WHERE is_active = true
            `;
            
            let baseParams = [];
            
            if (role) {
                query += ' AND role = ?';
                baseParams.push(role);
            }
            
            if (search) {
                query += ' AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
                const searchTerm = `%${search}%`;
                baseParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
            
            // Get total count first (without pagination)
            const countQuery = query.replace(
                'SELECT id, username, email, first_name, last_name, role, created_at, last_login, is_active', 
                'SELECT COUNT(*) as total'
            );
            const countResult = await database.query(countQuery, [...baseParams]);
            const total = countResult[0].total;
            
            // Add pagination to main query
            query += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
            
            const users = await database.query(query, baseParams);
            
            res.json({
                users: users,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: total,
                    pages: Math.ceil(total / limitNum)
                }
            });
            
        } catch (error) {
            next(error);
        }
    }
}

// Only keep route for getting all users (admin only)
router.get('/', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(UserController.getAllUsers));

module.exports = router;