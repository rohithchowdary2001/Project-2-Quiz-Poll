const express = require('express');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');
const router = express.Router();

const database = require('../config/database');
const AuthMiddleware = require('../middleware/auth');
const ErrorHandler = require('../middleware/errorHandler');
const AuditLogger = require('../middleware/auditLogger');

class AdminController {
    // Get system dashboard statistics
    static async getDashboardStats(req, res, next) {
        try {
            const stats = await database.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
                    (SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = true) as admin_count,
                    (SELECT COUNT(*) FROM users WHERE role = 'professor' AND is_active = true) as professor_count,
                    (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = true) as student_count,
                    (SELECT COUNT(*) FROM classes WHERE is_active = true) as total_classes,
                    (SELECT COUNT(*) FROM quizzes WHERE is_active = true) as total_quizzes,
                    (SELECT COUNT(*) FROM quiz_submissions WHERE is_completed = true) as total_submissions,
                    (SELECT COUNT(*) FROM users WHERE last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as active_last_week,
                    (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as new_users_last_month,
                    (SELECT AVG(total_score/max_score) * 100 FROM quiz_submissions WHERE is_completed = true AND max_score > 0) as average_quiz_score
            `);

            // Get recent activity
            const recentActivity = await database.query(`
                SELECT action, COUNT(*) as count, DATE(created_at) as date
                FROM audit_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY action, DATE(created_at)
                ORDER BY created_at DESC
                LIMIT 20
            `);

            // Get top performing classes
            const topClasses = await database.query(`
                SELECT c.name, c.class_code, COUNT(qs.id) as submission_count,
                       AVG(qs.total_score/qs.max_score) * 100 as avg_score,
                       u.first_name, u.last_name
                FROM classes c
                JOIN users u ON c.professor_id = u.id
                LEFT JOIN quizzes q ON c.id = q.class_id
                LEFT JOIN quiz_submissions qs ON q.id = qs.quiz_id AND qs.is_completed = true
                WHERE c.is_active = true
                GROUP BY c.id
                HAVING submission_count > 0
                ORDER BY avg_score DESC
                LIMIT 10
            `);

            res.json({
                stats: stats[0],
                recentActivity: recentActivity,
                topClasses: topClasses
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Get audit logs with filtering
    static async getAuditLogs(req, res, next) {
        try {
            const { action, userId, startDate, endDate, page = 1, limit = 50 } = req.query;
            
            console.log('AdminController - Getting audit logs with filters:', {
                action, userId, startDate, endDate, page, limit
            });
            
            const result = await AuditLogger.getAuditLogs(
                action || null,
                userId || null,
                startDate || null,
                endDate || null,
                page,
                limit
            );
            
            console.log('AdminController - Audit logs retrieved:', result.logs.length);
            
            res.json({
                logs: result.logs,
                pagination: result.pagination
            });
            
        } catch (error) {
            console.error('AdminController - Error getting audit logs:', error);
            next(error);
        }
    }

    // Get system activity analytics
    static async getSystemAnalytics(req, res, next) {
        try {
            const { days = 30 } = req.query;
            
            // Get basic system stats
            const stats = await database.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
                    (SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = true) as admin_count,
                    (SELECT COUNT(*) FROM users WHERE role = 'professor' AND is_active = true) as professor_count,
                    (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = true) as student_count,
                    (SELECT COUNT(*) FROM users WHERE last_login >= DATE_SUB(NOW(), INTERVAL 1 DAY)) as active_24h,
                    (SELECT COUNT(*) FROM classes WHERE is_active = true) as total_classes,
                    (SELECT COUNT(*) FROM quizzes WHERE is_active = true) as total_quizzes,
                    (SELECT COUNT(*) FROM quizzes WHERE is_active = true AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as quizzes_created_7d,
                    (SELECT COUNT(*) FROM quiz_submissions WHERE is_completed = true) as total_submissions,
                    (SELECT COUNT(*) FROM quiz_submissions WHERE is_completed = true AND submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as submissions_last_7d,
                    (SELECT AVG(total_score/max_score) * 100 FROM quiz_submissions WHERE is_completed = true AND max_score > 0) as average_score
            `);

            // Get recent users (last 10 registered)
            const recentUsers = await database.query(`
                SELECT id, username, email, first_name, last_name, role, created_at
                FROM users 
                WHERE is_active = true 
                ORDER BY created_at DESC 
                LIMIT 10
            `);

            // User registration trends
            const userTrends = await database.query(`
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM users 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(created_at)
                ORDER BY date
            `, [days]);

            // Quiz activity trends
            const quizTrends = await database.query(`
                SELECT DATE(submitted_at) as date, COUNT(*) as submissions,
                       AVG(total_score/max_score) * 100 as avg_score
                FROM quiz_submissions 
                WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND is_completed = true
                GROUP BY DATE(submitted_at)
                ORDER BY date
            `, [days]);

            // Most active users
            const activeUsers = await database.query(`
                SELECT u.username, u.first_name, u.last_name, u.role,
                       COUNT(al.id) as activity_count
                FROM users u
                LEFT JOIN audit_logs al ON u.id = al.user_id 
                WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY u.id
                ORDER BY activity_count DESC
                LIMIT 10
            `, [days]);

            const basicStats = stats[0];

            res.json({
                users: {
                    total: basicStats.total_users,
                    admins: basicStats.admin_count,
                    professors: basicStats.professor_count,
                    students: basicStats.student_count,
                    active_24h: basicStats.active_24h
                },
                classes: {
                    total: basicStats.total_classes
                },
                quizzes: {
                    total: basicStats.total_quizzes,
                    active: basicStats.total_quizzes, // Assume all quizzes are active for now
                    created_7d: basicStats.quizzes_created_7d
                },
                submissions: {
                    total: basicStats.total_submissions,
                    last_7d: basicStats.submissions_last_7d,
                    avg_score: Math.round(basicStats.average_score || 0)
                },
                recentUsers: recentUsers,
                userTrends: userTrends,
                quizTrends: quizTrends,
                activeUsers: activeUsers
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Export system data
    static async exportData(req, res, next) {
        try {
            const { type, format = 'csv' } = req.query;
            
            if (!['users', 'classes', 'quizzes', 'submissions', 'audit_logs'].includes(type)) {
                throw ErrorHandler.validationError('Invalid export type');
            }

            let data = [];
            let filename = '';

            switch (type) {
                case 'users':
                    data = await database.query(`
                        SELECT id, username, email, first_name, last_name, role, 
                               is_active, created_at, last_login
                        FROM users
                        ORDER BY created_at DESC
                    `);
                    filename = 'users_export';
                    break;

                case 'classes':
                    data = await database.query(`
                        SELECT c.id, c.name, c.description, c.class_code, c.created_at,
                               u.username as professor_username, u.first_name, u.last_name,
                               (SELECT COUNT(*) FROM class_enrollments WHERE class_id = c.id AND is_active = true) as student_count
                        FROM classes c
                        JOIN users u ON c.professor_id = u.id
                        WHERE c.is_active = true
                        ORDER BY c.created_at DESC
                    `);
                    filename = 'classes_export';
                    break;

                case 'quizzes':
                    data = await database.query(`
                        SELECT q.id, q.title, q.description, q.deadline, q.time_limit_minutes, q.created_at,
                               c.name as class_name, c.class_code,
                               u.username as professor_username,
                               (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count,
                               (SELECT COUNT(*) FROM quiz_submissions WHERE quiz_id = q.id AND is_completed = true) as submission_count
                        FROM quizzes q
                        JOIN classes c ON q.class_id = c.id
                        JOIN users u ON q.professor_id = u.id
                        WHERE q.is_active = true
                        ORDER BY q.created_at DESC
                    `);
                    filename = 'quizzes_export';
                    break;

                case 'submissions':
                    data = await database.query(`
                        SELECT qs.id, qs.started_at, qs.submitted_at, qs.time_taken_minutes,
                               qs.total_score, qs.max_score, qs.is_completed,
                               ROUND((qs.total_score / qs.max_score) * 100, 2) as percentage,
                               q.title as quiz_title,
                               c.name as class_name,
                               u.username as student_username, u.first_name, u.last_name
                        FROM quiz_submissions qs
                        JOIN quizzes q ON qs.quiz_id = q.id
                        JOIN classes c ON q.class_id = c.id
                        JOIN users u ON qs.student_id = u.id
                        WHERE qs.is_completed = true
                        ORDER BY qs.submitted_at DESC
                    `);
                    filename = 'submissions_export';
                    break;

                case 'audit_logs':
                    data = await database.query(`
                        SELECT al.action, al.table_name, al.created_at, al.ip_address,
                               u.username, u.first_name, u.last_name
                        FROM audit_logs al
                        LEFT JOIN users u ON al.user_id = u.id
                        WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                        ORDER BY al.created_at DESC
                        LIMIT 10000
                    `);
                    filename = 'audit_logs_export';
                    break;
            }

            if (format === 'csv') {
                // Create CSV file
                const uploadsDir = path.join(__dirname, '../../uploads');
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const csvFilename = `${filename}_${timestamp}.csv`;
                const csvPath = path.join(uploadsDir, csvFilename);

                if (data.length > 0) {
                    const csvWriter = createCsvWriter({
                        path: csvPath,
                        header: Object.keys(data[0]).map(key => ({
                            id: key,
                            title: key.replace(/_/g, ' ').toUpperCase()
                        }))
                    });

                    await csvWriter.writeRecords(data);
                }

                // Log export activity
                await AuditLogger.logDataExport(req.user.id, type, data.length, req);

                res.json({
                    message: 'Data exported successfully',
                    filename: csvFilename,
                    recordCount: data.length,
                    downloadUrl: `/uploads/${csvFilename}`
                });
            } else {
                // Return JSON data directly
                await AuditLogger.logDataExport(req.user.id, type, data.length, req);
                
                res.json({
                    data: data,
                    recordCount: data.length,
                    exportedAt: new Date()
                });
            }
            
        } catch (error) {
            next(error);
        }
    }

    // System health check
    static async getSystemHealth(req, res, next) {
        try {
            // Database connection test
            const dbHealth = await database.testConnection();

            // Check disk space (upload directory)
            const uploadsDir = path.join(__dirname, '../../uploads');
            let diskSpace = null;
            
            try {
                const stats = fs.statSync(uploadsDir);
                diskSpace = {
                    exists: true,
                    writable: true
                };
            } catch (error) {
                diskSpace = {
                    exists: false,
                    writable: false,
                    error: error.message
                };
            }

            // Get system metrics
            const metrics = await database.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
                    (SELECT COUNT(*) FROM classes WHERE is_active = true) as active_classes,
                    (SELECT COUNT(*) FROM quizzes WHERE is_active = true) as active_quizzes,
                    (SELECT COUNT(*) FROM quiz_submissions WHERE is_completed = true AND submitted_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as submissions_24h
            `);

            res.json({
                status: dbHealth && diskSpace.writable ? 'healthy' : 'degraded',
                timestamp: new Date(),
                database: {
                    connected: dbHealth,
                    status: dbHealth ? 'connected' : 'disconnected'
                },
                storage: diskSpace,
                metrics: metrics[0],
                uptime: process.uptime()
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Manage system settings
    static async getSystemSettings(req, res, next) {
        try {
            const settings = await database.findAll('system_settings', {}, {
                orderBy: 'setting_key'
            });

            res.json({
                settings: settings
            });
            
        } catch (error) {
            next(error);
        }
    }

    static async updateSystemSetting(req, res, next) {
        try {
            const { key, value } = req.body;
            
            // Validate required fields
            ErrorHandler.validateRequired(['key', 'value'], req.body);

            // Check if setting exists
            const existingSetting = await database.findOne('system_settings', { setting_key: key });

            if (existingSetting) {
                // Update existing setting
                await database.update('system_settings', 
                    { setting_value: value }, 
                    { setting_key: key }
                );
            } else {
                // Create new setting
                await database.insert('system_settings', {
                    setting_key: key,
                    setting_value: value,
                    description: `Custom setting: ${key}`
                });
            }

            // Log setting change
            await AuditLogger.logUserAction(
                req.user.id,
                'SETTING_UPDATE',
                'system_settings',
                null,
                existingSetting ? { setting_value: existingSetting.setting_value } : null,
                { setting_key: key, setting_value: value },
                req
            );

            res.json({
                message: 'System setting updated successfully',
                setting: {
                    key: key,
                    value: value
                }
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Clean up old data
    static async cleanupOldData(req, res, next) {
        try {
            const { days = 90 } = req.body;
            
            // Clean up old audit logs
            const auditResult = await database.query(
                'DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [days]
            );

            // Clean up incomplete submissions older than 1 day
            const submissionResult = await database.query(
                'DELETE FROM quiz_submissions WHERE is_completed = false AND started_at < DATE_SUB(NOW(), INTERVAL 1 DAY)'
            );

            // Log cleanup activity
            await AuditLogger.logUserAction(
                req.user.id,
                'DATA_CLEANUP',
                'system',
                null,
                null,
                { 
                    audit_logs_deleted: auditResult.affectedRows,
                    incomplete_submissions_deleted: submissionResult.affectedRows,
                    days_threshold: days
                },
                req
            );

            res.json({
                message: 'Data cleanup completed successfully',
                results: {
                    auditLogsDeleted: auditResult.affectedRows,
                    incompleteSubmissionsDeleted: submissionResult.affectedRows
                }
            });
            
        } catch (error) {
            next(error);
        }
    }
}

// Admin routes
router.get('/dashboard', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(AdminController.getDashboardStats));
router.get('/audit-logs', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(AdminController.getAuditLogs));
router.get('/analytics', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(AdminController.getSystemAnalytics));
router.get('/export', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(AdminController.exportData));
router.get('/health', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(AdminController.getSystemHealth));
router.get('/settings', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(AdminController.getSystemSettings));
router.post('/settings', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(AdminController.updateSystemSetting));
router.post('/cleanup', AuthMiddleware.verifyToken, AuthMiddleware.requireAdmin, ErrorHandler.asyncHandler(AdminController.cleanupOldData));

module.exports = router; 