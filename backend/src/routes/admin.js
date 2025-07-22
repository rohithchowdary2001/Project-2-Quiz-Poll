const express = require("express");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const path = require("path");
const fs = require("fs");
const router = express.Router();

const database = require("../config/database");
const AuthMiddleware = require("../middleware/auth");
const ErrorHandler = require("../middleware/errorHandler");
const AuditLogger = require("../middleware/auditLogger");

class AdminController {
  // Get system dashboard statistics
  static async getDashboardStats(req, res, next) {
    try {
      const stats = await database.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
                    (SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = true) as admin_count,
                    (SELECT COUNT(*) FROM users WHERE role = 'professor' AND is_active = true) as professor_count,
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
        topClasses: topClasses,
      });
    } catch (error) {
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

      const basicStats = stats[0];

      res.json({
        users: {
          total: basicStats.total_users,
          admins: basicStats.admin_count,
          professors: basicStats.professor_count,
          students: basicStats.student_count,
          active_24h: basicStats.active_24h,
        },
        classes: {
          total: basicStats.total_classes,
        },
        quizzes: {
          total: basicStats.total_quizzes,
          active: basicStats.total_quizzes, // Assume all quizzes are active for now
          created_7d: basicStats.quizzes_created_7d,
        },
        submissions: {
          total: basicStats.total_submissions,
          last_7d: basicStats.submissions_last_7d,
          avg_score: Math.round(basicStats.average_score || 0),
        },
        recentUsers: recentUsers,
        userTrends: userTrends,
        quizTrends: quizTrends,
        activeUsers: activeUsers,
      });
    } catch (error) {
      next(error);
    }
  }

  

  static async updateSystemSetting(req, res, next) {
    try {
      const { key, value } = req.body;

      // Validate required fields
      ErrorHandler.validateRequired(["key", "value"], req.body);

      // Check if setting exists
      const existingSetting = await database.findOne("system_settings", {
        setting_key: key,
      });

      if (existingSetting) {
        // Update existing setting
        await database.update(
          "system_settings",
          { setting_value: value },
          { setting_key: key }
        );
      } else {
        // Create new setting
        await database.insert("system_settings", {
          setting_key: key,
          setting_value: value,
          description: `Custom setting: ${key}`,
        });
      }

      // Log setting change
      await AuditLogger.logUserAction(
        req.user.id,
        "SETTING_UPDATE",
        "system_settings",
        null,
        existingSetting
          ? { setting_value: existingSetting.setting_value }
          : null,
        { setting_key: key, setting_value: value },
        req
      );

      res.json({
        message: "System setting updated successfully",
        setting: {
          key: key,
          value: value,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

// Admin routes
router.get(
  "/dashboard",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireAdmin,
  ErrorHandler.asyncHandler(AdminController.getDashboardStats)
);
router.get(
  "/settings",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireAdmin,
  ErrorHandler.asyncHandler(AdminController.getSystemSettings)
);
router.post(
  "/settings",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireAdmin,
  ErrorHandler.asyncHandler(AdminController.updateSystemSetting)
);

module.exports = router;
