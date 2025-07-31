const express = require('express');
const router = express.Router();

const database = require('../config/database');
const AuthMiddleware = require('../middleware/auth');
const ErrorHandler = require('../middleware/errorHandler');
const AuditLogger = require('../middleware/auditLogger');

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

    // Get user by ID
    static async getUserById(req, res, next) {
        try {
            const { id } = req.params;
            
            const user = await database.query(
                `SELECT id, username, email, first_name, last_name, role, 
                        created_at, last_login, is_active
                 FROM users 
                 WHERE id = ? AND is_active = true`,
                [id]
            );

            if (user.length === 0) {
                throw ErrorHandler.notFoundError('User not found');
            }

            res.json({
                user: user[0]
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Get professors (admin only)
    static async getProfessors(req, res, next) {
        try {
            const professors = await database.query(
                `SELECT id, username, email, first_name, last_name, 
                        created_at, last_login,
                        (SELECT COUNT(*) FROM classes WHERE professor_id = users.id AND is_active = true) as class_count
                 FROM users 
                 WHERE role = 'professor' AND is_active = true
                 ORDER BY created_at DESC`
            );

            res.json({
                professors: professors
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Get students (admin and professor)
    static async getStudents(req, res, next) {
        try {
            const { classId } = req.query;
            
            let query = `
                SELECT u.id, u.username, u.email, u.first_name, u.last_name, 
                       u.created_at, u.last_login
            `;
            
            let queryParams = [];
            
            if (classId) {
                // Get students enrolled in specific class
                query += `, ce.enrolled_at, ce.is_active as enrolled
                         FROM users u
                         JOIN class_enrollments ce ON u.id = ce.student_id
                         WHERE u.role = 'student' AND u.is_active = true 
                         AND ce.class_id = ?`;
                queryParams.push(classId);
                
                // Check if professor owns this class
                if (req.user.role === 'professor') {
                    const classOwner = await database.findOne('classes', {
                        id: classId,
                        professor_id: req.user.id
                    });
                    
                    if (!classOwner) {
                        throw ErrorHandler.forbiddenError('You can only view students in your own classes');
                    }
                }
            } else {
                // Get all students
                query += ` FROM users u
                         WHERE u.role = 'student' AND u.is_active = true`;
            }
            
            query += ' ORDER BY u.created_at DESC';
            
            const students = await database.query(query, queryParams);

            res.json({
                students: students
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Update user role (admin only)
    static async updateUserRole(req, res, next) {
        try {
            const { id } = req.params;
            const { role } = req.body;
            
            // Validate role
            if (!['admin', 'professor', 'student'].includes(role)) {
                throw ErrorHandler.validationError('Invalid role');
            }
            
            // Get current user data
            const currentUser = await database.findById('users', id);
            if (!currentUser) {
                throw ErrorHandler.notFoundError('User not found');
            }
            
            // Prevent changing own role
            if (parseInt(id) === req.user.id) {
                throw ErrorHandler.forbiddenError('You cannot change your own role');
            }
            
            // Update user role
            await database.update('users', { role: role }, { id: id });
            
            // Log role change
            await AuditLogger.logUserAction(
                req.user.id,
                'ROLE_CHANGE',
                'users',
                id,
                { role: currentUser.role },
                { role: role },
                req
            );
            
            res.json({
                message: 'User role updated successfully',
                user: {
                    id: currentUser.id,
                    username: currentUser.username,
                    email: currentUser.email,
                    firstName: currentUser.first_name,
                    lastName: currentUser.last_name,
                    role: role
                }
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Update user details (admin only)
    static async updateUser(req, res, next) {
        try {
            const { id } = req.params;
            const { username, email, firstName, lastName, isActive } = req.body;
            
            // Validate required fields
            ErrorHandler.validateRequired(['username', 'email', 'firstName', 'lastName'], req.body);
            
            // Validate email format
            ErrorHandler.validateEmail(email);
            
            // Get current user data
            const currentUser = await database.findById('users', id);
            if (!currentUser) {
                throw ErrorHandler.notFoundError('User not found');
            }
            
            // Check if username or email already exists for other users
            const existingUser = await database.query(
                'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
                [username.toLowerCase(), email.toLowerCase(), id]
            );
            
            if (existingUser.length > 0) {
                throw ErrorHandler.conflictError('Username or email already exists');
            }
            
            // Update user
            const updateData = {
                username: username.toLowerCase(),
                email: email.toLowerCase(),
                first_name: firstName,
                last_name: lastName
            };
            
            if (isActive !== undefined) {
                updateData.is_active = isActive;
            }
            
            await database.update('users', updateData, { id: id });
            
            // Log user update
            await AuditLogger.logUserAction(
                req.user.id,
                'USER_UPDATE',
                'users',
                id,
                {
                    username: currentUser.username,
                    email: currentUser.email,
                    first_name: currentUser.first_name,
                    last_name: currentUser.last_name,
                    is_active: currentUser.is_active
                },
                updateData,
                req
            );
            
            res.json({
                message: 'User updated successfully',
                user: {
                    id: parseInt(id),
                    username: username,
                    email: email,
                    firstName: firstName,
                    lastName: lastName,
                    role: currentUser.role,
                    isActive: updateData.is_active !== undefined ? updateData.is_active : currentUser.is_active
                }
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Delete user (admin only)
    static async deleteUser(req, res, next) {
        try {
            const { id } = req.params;
            
            // Get user data
            const user = await database.findById('users', id);
            if (!user) {
                throw ErrorHandler.notFoundError('User not found');
            }
            
            // Prevent deleting own account
            if (parseInt(id) === req.user.id) {
                throw ErrorHandler.forbiddenError('You cannot delete your own account');
            }
            
            // Check if user has dependencies
            const dependencies = await database.query(
                `SELECT 
                    (SELECT COUNT(*) FROM classes WHERE professor_id = ?) as classes,
                    (SELECT COUNT(*) FROM class_enrollments WHERE student_id = ?) as enrollments,
                    (SELECT COUNT(*) FROM quiz_submissions WHERE student_id = ?) as submissions
                `,
                [id, id, id]
            );
            
            const deps = dependencies[0];
            if (deps.classes > 0 || deps.enrollments > 0 || deps.submissions > 0) {
                // Soft delete - deactivate user instead of hard delete
                await database.update('users', { is_active: false }, { id: id });
                
                // Log soft delete
                await AuditLogger.logUserAction(
                    req.user.id,
                    'USER_DEACTIVATE',
                    'users',
                    id,
                    { is_active: true },
                    { is_active: false },
                    req
                );
                
                res.json({
                    message: 'User deactivated successfully (has dependencies)',
                    action: 'deactivated'
                });
            } else {
                // Hard delete - user has no dependencies
                await database.delete('users', { id: id });
                
                // Log hard delete
                await AuditLogger.logUserAction(
                    req.user.id,
                    'USER_DELETE',
                    'users',
                    id,
                    user,
                    null,
                    req
                );
                
                res.json({
                    message: 'User deleted successfully',
                    action: 'deleted'
                });
            }
            
        } catch (error) {
            next(error);
        }
    }

    // Get user statistics (admin only)
    static async getUserStats(req, res, next) {
        try {
            const stats = await database.query(`
                SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
                    SUM(CASE WHEN role = 'professor' THEN 1 ELSE 0 END) as professor_count,
                    SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as student_count,
                    SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_users,
                    SUM(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as active_last_30_days,
                    SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as registered_last_30_days
                FROM users
            `);
            
            res.json({
                stats: stats[0]
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Get user activity (admin only)
    static async getUserActivity(req, res, next) {
        try {
            const { userId } = req.params;
            const { days = 30 } = req.query;
            
            const activity = await AuditLogger.getUserActivitySummary(userId, days);
            
            res.json({
                activity: activity
            });
            
        } catch (error) {
            next(error);
        }
    }
}

// User routes
router.get('/', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(UserController.getAllUsers));
router.get('/professors', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(UserController.getProfessors));
router.get('/students', AuthMiddleware.verifyToken, AuthMiddleware.requireProfessorOrAdmin, ErrorHandler.asyncHandler(UserController.getStudents));
router.get('/stats', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(UserController.getUserStats));
router.get('/:id', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(UserController.getUserById));
router.get('/:userId/activity', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(UserController.getUserActivity));
router.put('/:id/role', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(UserController.updateUserRole));
router.put('/:id', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(UserController.updateUser));
router.delete('/:id', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(UserController.deleteUser));

module.exports = router; 