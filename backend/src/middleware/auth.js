const jwt = require('jsonwebtoken');
const config = require('../config/config');
const database = require('../config/database');

class AuthMiddleware {
    // Verify JWT token
    static async verifyToken(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    error: 'Access denied',
                    message: 'No token provided or invalid token format'
                });
            }

            const token = authHeader.substring(7); // Remove 'Bearer ' prefix
            
            try {
                const decoded = jwt.verify(token, config.jwt.secret);
                
                // Check if user still exists and is active
                const user = await database.findById('users', decoded.userId);
                if (!user || !user.is_active) {
                    return res.status(401).json({
                        error: 'Access denied',
                        message: 'User not found or account deactivated'
                    });
                }

                // Update last login
                await database.update('users', 
                    { last_login: new Date() }, 
                    { id: user.id }
                );

                // Add user info to request object
                req.user = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    firstName: user.first_name,
                    lastName: user.last_name
                };

                next();
                
            } catch (jwtError) {
                return res.status(401).json({
                    error: 'Access denied',
                    message: 'Invalid or expired token'
                });
            }

        } catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: 'Authentication verification failed'
            });
        }
    }

    // Role-based access control
    static requireRole(allowedRoles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Access denied',
                    message: 'Authentication required'
                });
            }

            // Allow array of roles or single role
            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
            
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({
                    error: 'Access denied',
                    message: `This action requires one of the following roles: ${roles.join(', ')}`
                });
            }

            next();
        };
    }

    // Admin only access
    static requireAdmin(req, res, next) {
        return AuthMiddleware.requireRole('admin')(req, res, next);
    }

    // Professor only access
    static requireProfessor(req, res, next) {
        return AuthMiddleware.requireRole('professor')(req, res, next);
    }

    // Professor or Admin access
    static requireProfessorOrAdmin(req, res, next) {
        return AuthMiddleware.requireRole(['professor', 'admin'])(req, res, next);
    }

    // Student only access
    static requireStudent(req, res, next) {
        return AuthMiddleware.requireRole('student')(req, res, next);
    }

    // Check if user can access specific resource
    static async canAccessClass(req, res, next) {
        try {
            const classId = req.params.classId || req.params.id;
            const user = req.user;

            if (!classId) {
                return res.status(400).json({
                    error: 'Bad request',
                    message: 'Class ID is required'
                });
            }

            // Admin can access all classes
            if (user.role === 'admin') {
                return next();
            }

            // Professor can access their own classes
            if (user.role === 'professor') {
                const classInfo = await database.findOne('classes', { 
                    id: classId, 
                    professor_id: user.id 
                });
                
                if (!classInfo) {
                    return res.status(403).json({
                        error: 'Access denied',
                        message: 'You can only access your own classes'
                    });
                }
                
                return next();
            }

            // Student can access classes they are enrolled in
            if (user.role === 'student') {
                const enrollment = await database.findOne('class_enrollments', {
                    class_id: classId,
                    student_id: user.id,
                    is_active: true
                });
                
                if (!enrollment) {
                    return res.status(403).json({
                        error: 'Access denied',
                        message: 'You are not enrolled in this class'
                    });
                }
                
                return next();
            }

            return res.status(403).json({
                error: 'Access denied',
                message: 'Insufficient permissions'
            });

        } catch (error) {
            console.error('Class access check error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to verify class access'
            });
        }
    }

    // Check if user can access specific quiz
    static async canAccessQuiz(req, res, next) {
        try {
            const quizId = req.params.quizId || req.params.id;
            const user = req.user;

            if (!quizId) {
                return res.status(400).json({
                    error: 'Bad request',
                    message: 'Quiz ID is required'
                });
            }

            // Get quiz information
            const quiz = await database.query(
                `SELECT q.*, c.professor_id, c.name as class_name 
                 FROM quizzes q 
                 JOIN classes c ON q.class_id = c.id 
                 WHERE q.id = ? AND q.is_active = true`,
                [quizId]
            );

            if (quiz.length === 0) {
                return res.status(404).json({
                    error: 'Not found',
                    message: 'Quiz not found'
                });
            }

            const quizInfo = quiz[0];

            // Admin can access all quizzes
            if (user.role === 'admin') {
                req.quiz = quizInfo;
                return next();
            }

            // Professor can access their own quizzes
            if (user.role === 'professor' && quizInfo.professor_id === user.id) {
                req.quiz = quizInfo;
                return next();
            }

            // Student can access quizzes in their enrolled classes
            if (user.role === 'student') {
                const enrollment = await database.findOne('class_enrollments', {
                    class_id: quizInfo.class_id,
                    student_id: user.id,
                    is_active: true
                });
                
                if (!enrollment) {
                    return res.status(403).json({
                        error: 'Access denied',
                        message: 'You are not enrolled in the class for this quiz'
                    });
                }
                
                req.quiz = quizInfo;
                return next();
            }

            return res.status(403).json({
                error: 'Access denied',
                message: 'Insufficient permissions to access this quiz'
            });

        } catch (error) {
            console.error('Quiz access check error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to verify quiz access'
            });
        }
    }

    // Optional authentication - doesn't fail if no token
    static async optionalAuth(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return next(); // Continue without authentication
            }

            const token = authHeader.substring(7);
            
            try {
                const decoded = jwt.verify(token, config.jwt.secret);
                const user = await database.findById('users', decoded.userId);
                
                if (user && user.is_active) {
                    req.user = {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        firstName: user.first_name,
                        lastName: user.last_name
                    };
                }
            } catch (jwtError) {
                // Token is invalid, but we don't fail - just continue without user
            }

            next();
            
        } catch (error) {
            console.error('Optional auth error:', error);
            next(); // Continue without authentication
        }
    }
}

module.exports = AuthMiddleware; 