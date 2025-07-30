const database = require('../config/database');
const config = require('../config/config');

class AuditLogger {
    static async logActivity(req, res, next) {
        // Skip audit logging for certain endpoints
        const skipPaths = [
            '/health',
            '/api/auth/verify',
            '/uploads',
            '/favicon.ico'
        ];

        const shouldSkip = skipPaths.some(path => req.path.startsWith(path));
        if (shouldSkip) {
            return next();
        }

        // Store original res.json to intercept response
        const originalJson = res.json;
        const originalSend = res.send;

        let responseData = null;
        let statusCode = null;

        // Intercept response
        res.json = function(data) {
            responseData = data;
            statusCode = res.statusCode;
            return originalJson.call(this, data);
        };

        res.send = function(data) {
            if (!responseData) {
                responseData = data;
                statusCode = res.statusCode;
            }
            return originalSend.call(this, data);
        };

        // Log after response is sent
        res.on('finish', async () => {
            try {
                await AuditLogger.logEvent({
                    userId: req.user?.id || null,
                    action: AuditLogger.getActionFromRequest(req),
                    method: req.method,
                    path: req.path,
                    query: req.query,
                    body: AuditLogger.sanitizeBody(req.body),
                    statusCode: statusCode || res.statusCode,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    responseData: AuditLogger.sanitizeResponse(responseData),
                    duration: Date.now() - req.startTime
                });
            } catch (error) {
                console.error('Audit logging error:', error);
            }
        });

        // Record start time
        req.startTime = Date.now();
        next();
    }

    static async logEvent(eventData) {
        if (!config.logging.auditLog) {
            return;
        }

        try {
            const logEntry = {
                user_id: eventData.userId,
                action: eventData.action,
                table_name: AuditLogger.getTableFromPath(eventData.path),
                record_id: AuditLogger.getRecordId(eventData.path),
                old_values: null,
                new_values: JSON.stringify({
                    method: eventData.method,
                    path: eventData.path,
                    query: eventData.query,
                    body: eventData.body,
                    statusCode: eventData.statusCode,
                    duration: eventData.duration,
                    response: eventData.responseData
                }),
                ip_address: eventData.ipAddress,
                user_agent: eventData.userAgent
            };

            await database.insert('audit_logs', logEntry);
        } catch (error) {
            console.error('Failed to save audit log:', error);
        }
    }

    static async logUserAction(userId, action, tableName, recordId, oldValues = null, newValues = null, req = null) {
        try {
            const logEntry = {
                user_id: userId,
                action: action,
                table_name: tableName,
                record_id: recordId,
                old_values: oldValues ? JSON.stringify(oldValues) : null,
                new_values: newValues ? JSON.stringify(newValues) : null,
                ip_address: req?.ip || null,
                user_agent: req?.get('User-Agent') || null
            };

            await database.insert('audit_logs', logEntry);
        } catch (error) {
            console.error('Failed to log user action:', error);
        }
    }

    static async logAuthentication(userId, action, success, ipAddress, userAgent, details = null) {
        try {
            const logEntry = {
                user_id: userId,
                action: `AUTH_${action}`,
                table_name: 'users',
                record_id: userId,
                old_values: null,
                new_values: JSON.stringify({
                    success: success,
                    details: details,
                    timestamp: new Date().toISOString()
                }),
                ip_address: ipAddress,
                user_agent: userAgent
            };

            await database.insert('audit_logs', logEntry);
        } catch (error) {
            console.error('Failed to log authentication:', error);
        }
    }

    static async logQuizActivity(userId, action, quizId, submissionId = null, details = null, req = null) {
        try {
            const logEntry = {
                user_id: userId,
                action: `QUIZ_${action}`,
                table_name: 'quizzes',
                record_id: quizId,
                old_values: submissionId ? JSON.stringify({ submission_id: submissionId }) : null,
                new_values: JSON.stringify({
                    details: details,
                    timestamp: new Date().toISOString()
                }),
                ip_address: req?.ip || null,
                user_agent: req?.get('User-Agent') || null
            };

            await database.insert('audit_logs', logEntry);
        } catch (error) {
            console.error('Failed to log quiz activity:', error);
        }
    }

    static async logDataExport(userId, exportType, dataCount, req = null) {
        try {
            const logEntry = {
                user_id: userId,
                action: 'DATA_EXPORT',
                table_name: exportType,
                record_id: null,
                old_values: null,
                new_values: JSON.stringify({
                    export_type: exportType,
                    record_count: dataCount,
                    timestamp: new Date().toISOString()
                }),
                ip_address: req?.ip || null,
                user_agent: req?.get('User-Agent') || null
            };

            await database.insert('audit_logs', logEntry);
        } catch (error) {
            console.error('Failed to log data export:', error);
        }
    }

    static getActionFromRequest(req) {
        const method = req.method.toLowerCase();
        const path = req.path.toLowerCase();

        // Authentication actions
        if (path.includes('/auth/login')) return 'LOGIN';
        if (path.includes('/auth/register')) return 'REGISTER';
        if (path.includes('/auth/logout')) return 'LOGOUT';

        // CRUD operations
        if (method === 'get' && path.includes('/')) return 'VIEW';
        if (method === 'post') return 'CREATE';
        if (method === 'put' || method === 'patch') return 'UPDATE';
        if (method === 'delete') return 'DELETE';

        // Specific actions
        if (path.includes('/submit')) return 'SUBMIT';
        if (path.includes('/export')) return 'EXPORT';
        if (path.includes('/enroll')) return 'ENROLL';
        if (path.includes('/unenroll')) return 'UNENROLL';
        if (path.includes('/assign')) return 'ASSIGN';

        return method.toUpperCase();
    }

    static getTableFromPath(path) {
        const pathSegments = path.split('/').filter(segment => segment);
        
        if (pathSegments.includes('users')) return 'users';
        if (pathSegments.includes('classes')) return 'classes';
        if (pathSegments.includes('quizzes')) return 'quizzes';
        if (pathSegments.includes('submissions')) return 'quiz_submissions';
        if (pathSegments.includes('auth')) return 'users';
        if (pathSegments.includes('admin')) return 'admin';

        return 'unknown';
    }

    static getRecordId(path) {
        const segments = path.split('/').filter(segment => segment);
        
        // Look for numeric IDs in path segments
        for (const segment of segments) {
            if (/^\d+$/.test(segment)) {
                return parseInt(segment);
            }
        }
        
        return null;
    }

    static sanitizeBody(body) {
        if (!body || typeof body !== 'object') return body;

        const sanitized = { ...body };
        
        // Remove sensitive fields
        const sensitiveFields = ['password', 'password_hash', 'token', 'secret'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });

        return sanitized;
    }

    static sanitizeResponse(response) {
        if (!response || typeof response !== 'object') return response;

        const sanitized = { ...response };
        
        // Remove sensitive response fields
        const sensitiveFields = ['password', 'password_hash', 'token'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });

        // If response has user data, sanitize it
        if (sanitized.user) {
            sanitized.user = AuditLogger.sanitizeResponse(sanitized.user);
        }

        // If response has data array, sanitize each item
        if (sanitized.data && Array.isArray(sanitized.data)) {
            sanitized.data = sanitized.data.map(item => AuditLogger.sanitizeResponse(item));
        }

        return sanitized;
    }

    // Get audit logs with filtering
    static async getAuditLogs(action = null, userId = null, startDate = null, endDate = null, page = 1, limit = 50) {
        try {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const offset = (pageNum - 1) * limitNum;
            
            let query = `
                SELECT al.*, u.username, u.first_name, u.last_name 
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE 1=1
            `;
            
            let queryParams = [];
            
            if (action) {
                query += ' AND al.action = ?';
                queryParams.push(action);
            }
            
            if (userId) {
                query += ' AND al.user_id = ?';
                queryParams.push(parseInt(userId));
            }
            
            if (startDate) {
                query += ' AND al.created_at >= ?';
                queryParams.push(startDate);
            }
            
            if (endDate) {
                query += ' AND al.created_at <= ?';
                queryParams.push(endDate);
            }
            
            query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
            queryParams.push(limitNum, offset);
            
            const logs = await database.query(query, queryParams);
            
            return {
                logs: logs,
                pagination: {
                    page: pageNum,
                    limit: limitNum
                }
            };
            
        } catch (error) {
            console.error('Failed to get audit logs:', error);
            throw error;
        }
    }

    // Get user activity summary
    static async getUserActivitySummary(userId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const query = `
                SELECT 
                    action,
                    COUNT(*) as count,
                    DATE(created_at) as date
                FROM audit_logs 
                WHERE user_id = ? AND created_at >= ?
                GROUP BY action, DATE(created_at)
                ORDER BY created_at DESC
            `;

            const results = await database.query(query, [userId, startDate]);
            return results;

        } catch (error) {
            console.error('Failed to get user activity summary:', error);
            throw error;
        }
    }

    // Get system activity stats
    static async getSystemActivityStats(days = 7) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const query = `
                SELECT 
                    action,
                    COUNT(*) as count,
                    COUNT(DISTINCT user_id) as unique_users
                FROM audit_logs 
                WHERE created_at >= ?
                GROUP BY action
                ORDER BY count DESC
            `;

            const results = await database.query(query, [startDate]);
            return results;

        } catch (error) {
            console.error('Failed to get system activity stats:', error);
            throw error;
        }
    }
}

module.exports = AuditLogger; 