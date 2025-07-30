const express = require('express');
const router = express.Router();

const database = require('../config/database');
const AuthMiddleware = require('../middleware/auth');
const ErrorHandler = require('../middleware/errorHandler');
const AuditLogger = require('../middleware/auditLogger');

class ClassController {
    // Get all classes (role-based filtering)
    static async getAllClasses(req, res, next) {
        try {
            const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
            const user = req.user;
            
            let query, queryParams = [];
            
            const validSortColumns = ['created_at', 'name', 'student_count', 'quiz_count'];
            const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
            const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            
            if (user.role === 'admin') {
                // Admin can see all classes
                query = `
                    SELECT c.*, u.first_name, u.last_name, u.username as professor_username,
                           (SELECT COUNT(*) FROM class_enrollments WHERE class_id = c.id AND is_active = true) as student_count,
                           (SELECT COUNT(*) FROM quizzes WHERE class_id = c.id AND is_active = true) as quiz_count
                    FROM classes c
                    JOIN users u ON c.professor_id = u.id
                    WHERE c.is_active = true
                `;
            } else if (user.role === 'professor') {
                // Professor can see their own classes
                query = `
                    SELECT c.*, u.first_name, u.last_name, u.username as professor_username,
                           (SELECT COUNT(*) FROM class_enrollments WHERE class_id = c.id AND is_active = true) as student_count,
                           (SELECT COUNT(*) FROM quizzes WHERE class_id = c.id AND is_active = true) as quiz_count
                    FROM classes c
                    JOIN users u ON c.professor_id = u.id
                    WHERE c.professor_id = ? AND c.is_active = true
                `;
                queryParams = [user.id];
            } else {
                // Student can see enrolled classes
                query = `
                    SELECT c.*, u.first_name, u.last_name, u.username as professor_username,
                           ce.enrolled_at,
                           (SELECT COUNT(*) FROM class_enrollments WHERE class_id = c.id AND is_active = true) as student_count,
                           (SELECT COUNT(*) FROM quizzes WHERE class_id = c.id AND is_active = true) as quiz_count
                    FROM classes c
                    JOIN users u ON c.professor_id = u.id
                    JOIN class_enrollments ce ON c.id = ce.class_id
                    WHERE ce.student_id = ? AND ce.is_active = true AND c.is_active = true
                `;
                queryParams = [user.id];
            }
            
            // Add sorting
            query += ` ORDER BY ${sortColumn} ${sortDirection}`;
            
            // Add pagination
            query += ' LIMIT ? OFFSET ?';
            queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
            
            const classes = await database.query(query, queryParams);
            
            res.json({
                classes: classes,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Get class by ID
    static async getClassById(req, res, next) {
        try {
            const { id } = req.params;
            
            const classData = await database.query(`
                SELECT c.*, u.first_name, u.last_name, u.username as professor_username,
                       (SELECT COUNT(*) FROM class_enrollments WHERE class_id = c.id AND is_active = true) as student_count,
                       (SELECT COUNT(*) FROM quizzes WHERE class_id = c.id AND is_active = true) as quiz_count
                FROM classes c
                JOIN users u ON c.professor_id = u.id
                WHERE c.id = ? AND c.is_active = true
            `, [id]);

            if (classData.length === 0) {
                throw ErrorHandler.notFoundError('Class not found');
            }

            const classInfo = classData[0];

            // Check access permissions
            const user = req.user;
            if (user.role === 'professor' && classInfo.professor_id !== user.id) {
                throw ErrorHandler.forbiddenError('You can only access your own classes');
            } else if (user.role === 'student') {
                const enrollment = await database.findOne('class_enrollments', {
                    class_id: id,
                    student_id: user.id,
                    is_active: true
                });
                
                if (!enrollment) {
                    throw ErrorHandler.forbiddenError('You are not enrolled in this class');
                }
            }

            res.json({
                class: classInfo
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Create new class (professor only)
    static async createClass(req, res, next) {
        try {
            const { name, description, classCode } = req.body;
            
            // Validate required fields
            ErrorHandler.validateRequired(['name', 'classCode'], req.body);
            
            // Check if class code already exists
            const existingClass = await database.findOne('classes', { class_code: classCode });
            if (existingClass) {
                throw ErrorHandler.conflictError('Class code already exists');
            }
            
            // Create class
            const result = await database.insert('classes', {
                name: name,
                description: description || null,
                class_code: classCode,
                professor_id: req.user.id
            });
            
            // Log class creation
            await AuditLogger.logUserAction(
                req.user.id,
                'CLASS_CREATE',
                'classes',
                result.insertId,
                null,
                { name, description, class_code: classCode },
                req
            );
            
            res.status(201).json({
                message: 'Class created successfully',
                class: {
                    id: result.insertId,
                    name: name,
                    description: description,
                    classCode: classCode,
                    professorId: req.user.id
                }
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Update class (professor only)
    static async updateClass(req, res, next) {
        try {
            const { id } = req.params;
            const { name, description, classCode } = req.body;
            
            // Validate required fields
            ErrorHandler.validateRequired(['name', 'classCode'], req.body);
            
            // Get current class data
            const currentClass = await database.findOne('classes', { 
                id: id, 
                professor_id: req.user.id,
                is_active: true 
            });
            
            if (!currentClass) {
                throw ErrorHandler.notFoundError('Class not found or you do not have permission to edit it');
            }
            
            // Check if new class code conflicts with existing classes
            if (classCode !== currentClass.class_code) {
                const existingClass = await database.findOne('classes', { class_code: classCode });
                if (existingClass) {
                    throw ErrorHandler.conflictError('Class code already exists');
                }
            }
            
            // Update class
            await database.update('classes', {
                name: name,
                description: description || null,
                class_code: classCode
            }, { id: id });
            
            // Log class update
            await AuditLogger.logUserAction(
                req.user.id,
                'CLASS_UPDATE',
                'classes',
                id,
                {
                    name: currentClass.name,
                    description: currentClass.description,
                    class_code: currentClass.class_code
                },
                { name, description, class_code: classCode },
                req
            );
            
            res.json({
                message: 'Class updated successfully',
                class: {
                    id: parseInt(id),
                    name: name,
                    description: description,
                    classCode: classCode,
                    professorId: req.user.id
                }
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Delete class (professor only)
    static async deleteClass(req, res, next) {
        try {
            const { id } = req.params;
            
            // Get class data
            const classData = await database.findOne('classes', { 
                id: id, 
                professor_id: req.user.id,
                is_active: true 
            });
            
            if (!classData) {
                throw ErrorHandler.notFoundError('Class not found or you do not have permission to delete it');
            }
            
            // Check if class has dependencies (enrollments, quizzes)
            const dependencies = await database.query(`
                SELECT 
                    (SELECT COUNT(*) FROM class_enrollments WHERE class_id = ? AND is_active = true) as enrollments,
                    (SELECT COUNT(*) FROM quizzes WHERE class_id = ? AND is_active = true) as quizzes
            `, [id, id]);
            
            const deps = dependencies[0];
            
            if (deps.enrollments > 0 || deps.quizzes > 0) {
                // Soft delete - deactivate class
                await database.update('classes', { is_active: false }, { id: id });
                
                // Also deactivate enrollments
                await database.update('class_enrollments', { is_active: false }, { class_id: id });
                
                // Log soft delete
                await AuditLogger.logUserAction(
                    req.user.id,
                    'CLASS_DEACTIVATE',
                    'classes',
                    id,
                    { is_active: true },
                    { is_active: false },
                    req
                );
                
                res.json({
                    message: 'Class deactivated successfully (has dependencies)',
                    action: 'deactivated'
                });
            } else {
                // Hard delete - class has no dependencies
                await database.delete('classes', { id: id });
                
                // Log hard delete
                await AuditLogger.logUserAction(
                    req.user.id,
                    'CLASS_DELETE',
                    'classes',
                    id,
                    classData,
                    null,
                    req
                );
                
                res.json({
                    message: 'Class deleted successfully',
                    action: 'deleted'
                });
            }
            
        } catch (error) {
            next(error);
        }
    }

    // Get class students
    static async getClassStudents(req, res, next) {
        try {
            const { id } = req.params;
            
            // Check class access
            await AuthMiddleware.canAccessClass(req, res, async () => {
                const students = await database.query(`
                    SELECT u.id, u.username, u.email, u.first_name, u.last_name,
                           ce.enrolled_at, ce.is_active as enrolled,
                           (SELECT COUNT(*) FROM quiz_submissions qs 
                            JOIN quizzes q ON qs.quiz_id = q.id 
                            WHERE qs.student_id = u.id AND q.class_id = ?) as quiz_submissions
                    FROM users u
                    JOIN class_enrollments ce ON u.id = ce.student_id
                    WHERE ce.class_id = ? AND ce.is_active = true
                    ORDER BY ce.enrolled_at DESC
                `, [id, id]);

                res.json({
                    students: students
                });
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Enroll student in class (professor only)
    static async enrollStudent(req, res, next) {
        try {
            const { id } = req.params;
            const { studentId } = req.body;
            
            // Validate required fields
            ErrorHandler.validateRequired(['studentId'], req.body);
            
            // Check if class belongs to professor
            const classData = await database.findOne('classes', { 
                id: id, 
                professor_id: req.user.id,
                is_active: true 
            });
            
            if (!classData) {
                throw ErrorHandler.notFoundError('Class not found or you do not have permission');
            }
            
            // Check if student exists and is a student
            const student = await database.findOne('users', { 
                id: studentId, 
                role: 'student',
                is_active: true 
            });
            
            if (!student) {
                throw ErrorHandler.notFoundError('Student not found');
            }
            
            // Check if already enrolled
            const existingEnrollment = await database.findOne('class_enrollments', {
                class_id: id,
                student_id: studentId
            });
            
            if (existingEnrollment) {
                if (existingEnrollment.is_active) {
                    throw ErrorHandler.conflictError('Student is already enrolled in this class');
                } else {
                    // Reactivate enrollment
                    await database.update('class_enrollments', 
                        { is_active: true, enrolled_at: new Date() }, 
                        { class_id: id, student_id: studentId }
                    );
                }
            } else {
                // Create new enrollment
                await database.insert('class_enrollments', {
                    class_id: id,
                    student_id: studentId
                });
            }
            
            // Log enrollment
            await AuditLogger.logUserAction(
                req.user.id,
                'STUDENT_ENROLL',
                'class_enrollments',
                null,
                null,
                { class_id: id, student_id: studentId },
                req
            );
            
            res.json({
                message: 'Student enrolled successfully',
                enrollment: {
                    classId: parseInt(id),
                    studentId: parseInt(studentId),
                    studentName: `${student.first_name} ${student.last_name}`
                }
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Remove student from class (professor only)
    static async removeStudent(req, res, next) {
        try {
            const { id, studentId } = req.params;
            
            // Check if class belongs to professor
            const classData = await database.findOne('classes', { 
                id: id, 
                professor_id: req.user.id,
                is_active: true 
            });
            
            if (!classData) {
                throw ErrorHandler.notFoundError('Class not found or you do not have permission');
            }
            
            // Check if student is enrolled
            const enrollment = await database.findOne('class_enrollments', {
                class_id: id,
                student_id: studentId,
                is_active: true
            });
            
            if (!enrollment) {
                throw ErrorHandler.notFoundError('Student is not enrolled in this class');
            }
            
            // Remove student (soft delete)
            await database.update('class_enrollments', 
                { is_active: false }, 
                { class_id: id, student_id: studentId }
            );
            
            // Log removal
            await AuditLogger.logUserAction(
                req.user.id,
                'STUDENT_REMOVE',
                'class_enrollments',
                enrollment.id,
                { is_active: true },
                { is_active: false },
                req
            );
            
            res.json({
                message: 'Student removed from class successfully'
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Get class statistics
    static async getClassStats(req, res, next) {
        try {
            const { id } = req.params;
            
            // Check class access
            await AuthMiddleware.canAccessClass(req, res, async () => {
                const stats = await database.query(`
                    SELECT 
                        (SELECT COUNT(*) FROM class_enrollments WHERE class_id = ? AND is_active = true) as total_students,
                        (SELECT COUNT(*) FROM quizzes WHERE class_id = ? AND is_active = true) as total_quizzes,
                        (SELECT COUNT(*) FROM quiz_submissions qs 
                         JOIN quizzes q ON qs.quiz_id = q.id 
                         WHERE q.class_id = ? AND qs.is_completed = true) as total_submissions,
                        (SELECT AVG(qs.total_score) FROM quiz_submissions qs 
                         JOIN quizzes q ON qs.quiz_id = q.id 
                         WHERE q.class_id = ? AND qs.is_completed = true) as average_score
                `, [id, id, id, id]);

                res.json({
                    stats: stats[0]
                });
            });
            
        } catch (error) {
            next(error);
        }
    }
}

// Class routes
router.get('/', AuthMiddleware.verifyToken, ErrorHandler.asyncHandler(ClassController.getAllClasses));
router.get('/:id', AuthMiddleware.verifyToken, ErrorHandler.asyncHandler(ClassController.getClassById));
router.post('/', AuthMiddleware.verifyToken, AuthMiddleware.requireProfessor, ErrorHandler.asyncHandler(ClassController.createClass));
router.put('/:id', AuthMiddleware.verifyToken, AuthMiddleware.requireProfessor, ErrorHandler.asyncHandler(ClassController.updateClass));
router.delete('/:id', AuthMiddleware.verifyToken, AuthMiddleware.requireProfessor, ErrorHandler.asyncHandler(ClassController.deleteClass));
router.get('/:id/students', AuthMiddleware.verifyToken, ErrorHandler.asyncHandler(ClassController.getClassStudents));
router.post('/:id/students', AuthMiddleware.verifyToken, AuthMiddleware.requireProfessor, ErrorHandler.asyncHandler(ClassController.enrollStudent));
router.delete('/:id/students/:studentId', AuthMiddleware.verifyToken, AuthMiddleware.requireProfessor, ErrorHandler.asyncHandler(ClassController.removeStudent));
router.get('/:id/stats', AuthMiddleware.verifyToken, ErrorHandler.asyncHandler(ClassController.getClassStats));

module.exports = router; 