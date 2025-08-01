const express = require('express');
const router = express.Router();

const database = require('../config/database');
const AuthMiddleware = require('../middleware/auth');
const ErrorHandler = require('../middleware/errorHandler');
const AuditLogger = require('../middleware/auditLogger');

class QuizController {
    // Get all quizzes (role-based filtering)
    static async getAllQuizzes(req, res, next) {
        try {
            const { classId, page = 1, limit = 10 } = req.query;
            const user = req.user;
            
            let query, queryParams = [];
            
            const baseQuery = `
                SELECT q.*, c.name as class_name, c.class_code,
                       u.first_name as professor_first_name, u.last_name as professor_last_name,
                       (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count,
                       (SELECT COUNT(*) FROM quiz_submissions WHERE quiz_id = q.id AND is_completed = true) as submission_count
                FROM quizzes q
                JOIN classes c ON q.class_id = c.id
                JOIN users u ON q.professor_id = u.id
                WHERE q.is_active = true AND c.is_active = true
            `;
            
            if (user.role === 'admin') {
                query = baseQuery;
            } else if (user.role === 'professor') {
                query = baseQuery + ' AND q.professor_id = ?';
                queryParams.push(user.id);
            } else {
                // Student can see quizzes in their enrolled classes
                query = baseQuery + `
                    AND c.id IN (
                        SELECT class_id FROM class_enrollments 
                        WHERE student_id = ? AND is_active = true
                    )
                `;
                queryParams.push(user.id);
            }
            
            if (classId) {
                query += ' AND q.class_id = ?';
                queryParams.push(classId);
            }
            
            query += ' ORDER BY q.created_at DESC LIMIT ? OFFSET ?';
            queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
            
            const quizzes = await database.query(query, queryParams);
            
            res.json({
                quizzes: quizzes,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Get quiz by ID with questions
    static async getQuizById(req, res, next) {
        try {
            const { id } = req.params;
            const { includeAnswers = false } = req.query;
            
            // Get quiz details
            const quizData = await database.query(`
                SELECT q.*, c.name as class_name, c.class_code,
                       u.first_name as professor_first_name, u.last_name as professor_last_name
                FROM quizzes q
                JOIN classes c ON q.class_id = c.id
                JOIN users u ON q.professor_id = u.id
                WHERE q.id = ? AND q.is_active = true
            `, [id]);

            if (quizData.length === 0) {
                throw ErrorHandler.notFoundError('Quiz not found');
            }

            const quiz = quizData[0];

            // Check access permissions
            const user = req.user;
            if (user.role === 'professor' && quiz.professor_id !== user.id) {
                throw ErrorHandler.forbiddenError('You can only access your own quizzes');
            } else if (user.role === 'student') {
                const enrollment = await database.findOne('class_enrollments', {
                    class_id: quiz.class_id,
                    student_id: user.id,
                    is_active: true
                });
                
                if (!enrollment) {
                    throw ErrorHandler.forbiddenError('You are not enrolled in the class for this quiz');
                }
            }

            // Get questions and options
            let questionsQuery = `
                SELECT q.*, 
                       ao.id as option_id, ao.option_text, ao.option_order
            `;
            
            // Only include correct answers for professors/admin or if explicitly requested
            if ((user.role === 'professor' && quiz.professor_id === user.id) || 
                user.role === 'admin' || 
                includeAnswers === 'true') {
                questionsQuery += ', ao.is_correct';
            }
            
            questionsQuery += `
                FROM questions q
                LEFT JOIN answer_options ao ON q.id = ao.question_id
                WHERE q.quiz_id = ?
                ORDER BY q.question_order, ao.option_order
            `;

            const questionsData = await database.query(questionsQuery, [id]);

            // Structure questions with their options
            const questionsMap = new Map();
            questionsData.forEach(row => {
                if (!questionsMap.has(row.id)) {
                    questionsMap.set(row.id, {
                        id: row.id,
                        questionText: row.question_text,
                        questionType: row.question_type,
                        questionOrder: row.question_order,
                        points: row.points,
                        isRequired: row.is_required,
                        options: []
                    });
                }
                
                if (row.option_id) {
                    const option = {
                        id: row.option_id,
                        text: row.option_text,
                        order: row.option_order
                    };
                    
                    // Add correct answer info if available
                    if (row.is_correct !== undefined) {
                        option.isCorrect = row.is_correct;
                    }
                    
                    questionsMap.get(row.id).options.push(option);
                }
            });

            quiz.questions = Array.from(questionsMap.values());

            res.json({
                quiz: quiz
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Get available quizzes for students (includes submission status)
    static async getAvailableQuizzes(req, res, next) {
        try {
            const { classId, page = 1, limit = 10 } = req.query;
            const user = req.user;
            
            if (user.role !== 'student') {
                throw ErrorHandler.forbiddenError('Only students can access this endpoint');
            }
            
            let query = `
                SELECT q.*, c.name as class_name, c.class_code,
                       u.first_name as professor_first_name, u.last_name as professor_last_name,
                       (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count,
                       (SELECT COUNT(*) FROM quiz_submissions WHERE quiz_id = q.id AND is_completed = true) as submission_count,
                       qs.id as submission_id, qs.is_completed, qs.total_score, qs.max_score, qs.started_at, qs.submitted_at
                FROM quizzes q
                JOIN classes c ON q.class_id = c.id
                JOIN users u ON q.professor_id = u.id
                JOIN class_enrollments ce ON c.id = ce.class_id
                LEFT JOIN quiz_submissions qs ON q.id = qs.quiz_id AND qs.student_id = ?
                WHERE q.is_active = true AND c.is_active = true 
                AND ce.student_id = ? AND ce.is_active = true
            `;
            
            let queryParams = [user.id, user.id];
            
            if (classId) {
                query += ' AND q.class_id = ?';
                queryParams.push(classId);
            }
            
            query += ' ORDER BY q.deadline ASC, q.created_at DESC LIMIT ? OFFSET ?';
            queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
            
            const quizzes = await database.query(query, queryParams);
            
            res.json({
                quizzes: quizzes,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Create new quiz (professor only)
    static async createQuiz(req, res, next) {
        try {
            const { title, description, classId, deadline, timeLimit, questions } = req.body;
            
            // Validate required fields
            ErrorHandler.validateRequired(['title', 'classId', 'questions'], req.body);
            
            if (!Array.isArray(questions) || questions.length === 0) {
                throw ErrorHandler.validationError('Quiz must have at least one question');
            }
            
            // Check if class belongs to professor
            const classData = await database.findOne('classes', { 
                id: classId, 
                professor_id: req.user.id,
                is_active: true 
            });
            
            if (!classData) {
                throw ErrorHandler.notFoundError('Class not found or you do not have permission');
            }
            
            // Validate deadline if provided
            let deadlineDate = null;
            if (deadline) {
                deadlineDate = ErrorHandler.validateFutureDate(deadline, 'deadline');
            }
            
            // Create quiz in transaction
            const result = await database.transaction(async (connection) => {
                // Insert quiz
                const [quizResult] = await connection.execute(
                    `INSERT INTO quizzes (title, description, class_id, professor_id, deadline, time_limit_minutes) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [title, description || null, classId, req.user.id, deadlineDate, timeLimit || 30]
                );
                
                const quizId = quizResult.insertId;
                
                // Insert questions and options
                for (let i = 0; i < questions.length; i++) {
                    const question = questions[i];
                    
                    if (!question.questionText || !question.options || question.options.length < 2) {
                        throw ErrorHandler.validationError(`Question ${i + 1} must have text and at least 2 options`);
                    }
                    
                    // Insert question
                    const [questionResult] = await connection.execute(
                        `INSERT INTO questions (quiz_id, question_text, question_type, question_order, points) 
                         VALUES (?, ?, ?, ?, ?)`,
                        [quizId, question.questionText, question.questionType || 'single_choice', i + 1, question.points || 1]
                    );
                    
                    const questionId = questionResult.insertId;
                    
                    // Insert options
                    let hasCorrectAnswer = false;
                    for (let j = 0; j < question.options.length; j++) {
                        const option = question.options[j];
                        
                        if (!option.text) {
                            throw ErrorHandler.validationError(`Question ${i + 1}, option ${j + 1} must have text`);
                        }
                        
                        if (option.isCorrect) {
                            hasCorrectAnswer = true;
                        }
                        
                        await connection.execute(
                            `INSERT INTO answer_options (question_id, option_text, option_order, is_correct) 
                             VALUES (?, ?, ?, ?)`,
                            [questionId, option.text, j + 1, option.isCorrect || false]
                        );
                    }
                    
                    if (!hasCorrectAnswer) {
                        throw ErrorHandler.validationError(`Question ${i + 1} must have at least one correct answer`);
                    }
                }
                
                return quizId;
            });
            
            // Log quiz creation
            await AuditLogger.logUserAction(
                req.user.id,
                'QUIZ_CREATE',
                'quizzes',
                result,
                null,
                { title, class_id: classId, question_count: questions.length },
                req
            );
            
            res.status(201).json({
                message: 'Quiz created successfully',
                quiz: {
                    id: result,
                    title: title,
                    description: description,
                    classId: classId,
                    deadline: deadlineDate,
                    timeLimit: timeLimit || 30,
                    questionCount: questions.length
                }
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Update quiz (professor only)
    static async updateQuiz(req, res, next) {
        try {
            const { id } = req.params;
            const { title, description, deadline, timeLimit } = req.body;
            
            // Validate required fields
            ErrorHandler.validateRequired(['title'], req.body);
            
            // Get current quiz data
            const currentQuiz = await database.findOne('quizzes', { 
                id: id, 
                professor_id: req.user.id,
                is_active: true 
            });
            
            if (!currentQuiz) {
                throw ErrorHandler.notFoundError('Quiz not found or you do not have permission to edit it');
            }
            
            // Check if quiz has submissions
            const submissionCount = await database.count('quiz_submissions', { 
                quiz_id: id, 
                is_completed: true 
            });
            
            if (submissionCount > 0) {
                throw ErrorHandler.forbiddenError('Cannot edit quiz that has been submitted by students');
            }
            
            // Validate deadline if provided
            let deadlineDate = null;
            if (deadline) {
                deadlineDate = ErrorHandler.validateFutureDate(deadline, 'deadline');
            }
            
            // Update quiz
            await database.update('quizzes', {
                title: title,
                description: description || null,
                deadline: deadlineDate,
                time_limit_minutes: timeLimit || currentQuiz.time_limit_minutes
            }, { id: id });
            
            // Log quiz update
            await AuditLogger.logUserAction(
                req.user.id,
                'QUIZ_UPDATE',
                'quizzes',
                id,
                {
                    title: currentQuiz.title,
                    description: currentQuiz.description,
                    deadline: currentQuiz.deadline,
                    time_limit_minutes: currentQuiz.time_limit_minutes
                },
                { title, description, deadline: deadlineDate, time_limit_minutes: timeLimit },
                req
            );
            
            res.json({
                message: 'Quiz updated successfully'
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Delete quiz (professor only)
    static async deleteQuiz(req, res, next) {
        try {
            const { id } = req.params;
            
            // Get quiz data
            const quiz = await database.findOne('quizzes', { 
                id: id, 
                professor_id: req.user.id,
                is_active: true 
            });
            
            if (!quiz) {
                throw ErrorHandler.notFoundError('Quiz not found or you do not have permission to delete it');
            }
            
            // Check if quiz has submissions
            const submissionCount = await database.count('quiz_submissions', { 
                quiz_id: id, 
                is_completed: true 
            });
            
            if (submissionCount > 0) {
                // Soft delete - deactivate quiz
                await database.update('quizzes', { is_active: false }, { id: id });
                
                // Log soft delete
                await AuditLogger.logUserAction(
                    req.user.id,
                    'QUIZ_DEACTIVATE',
                    'quizzes',
                    id,
                    { is_active: true },
                    { is_active: false },
                    req
                );
                
                res.json({
                    message: 'Quiz deactivated successfully (has submissions)',
                    action: 'deactivated'
                });
            } else {
                // Hard delete - remove quiz and all related data
                await database.transaction(async (connection) => {
                    // Delete in correct order due to foreign key constraints
                    await connection.execute('DELETE FROM answer_options WHERE question_id IN (SELECT id FROM questions WHERE quiz_id = ?)', [id]);
                    await connection.execute('DELETE FROM questions WHERE quiz_id = ?', [id]);
                    await connection.execute('DELETE FROM quiz_submissions WHERE quiz_id = ?', [id]);
                    await connection.execute('DELETE FROM quizzes WHERE id = ?', [id]);
                });
                
                // Log hard delete
                await AuditLogger.logUserAction(
                    req.user.id,
                    'QUIZ_DELETE',
                    'quizzes',
                    id,
                    quiz,
                    null,
                    req
                );
                
                res.json({
                    message: 'Quiz deleted successfully',
                    action: 'deleted'
                });
            }
            
        } catch (error) {
            next(error);
        }
    }

    // Get quiz results (professor only)
    static async getQuizResults(req, res, next) {
        try {
            const { id } = req.params;
            
            // Check quiz ownership
            const quiz = await database.findOne('quizzes', { 
                id: id, 
                professor_id: req.user.id,
                is_active: true 
            });
            
            if (!quiz) {
                throw ErrorHandler.notFoundError('Quiz not found or you do not have permission');
            }
            
            // Get detailed results
            const results = await database.query(`
                SELECT 
                    u.id, u.username, u.first_name, u.last_name,
                    qs.started_at, qs.submitted_at, qs.time_taken_minutes,
                    qs.total_score, qs.max_score, qs.is_completed,
                    ROUND((qs.total_score / qs.max_score) * 100, 2) as percentage
                FROM quiz_submissions qs
                JOIN users u ON qs.student_id = u.id
                WHERE qs.quiz_id = ? AND qs.is_completed = true
                ORDER BY qs.submitted_at DESC
            `, [id]);
            
            // Get answer statistics
            const answerStats = await database.query(`
                SELECT 
                    q.id as question_id, q.question_text, q.question_order,
                    ao.id as option_id, ao.option_text, ao.is_correct,
                    COUNT(sa.id) as selection_count,
                    ROUND((COUNT(sa.id) / (SELECT COUNT(*) FROM quiz_submissions WHERE quiz_id = ? AND is_completed = true)) * 100, 2) as percentage
                FROM questions q
                LEFT JOIN answer_options ao ON q.id = ao.question_id
                LEFT JOIN student_answers sa ON ao.id = sa.selected_option_id
                LEFT JOIN quiz_submissions qs ON sa.submission_id = qs.id AND qs.quiz_id = ?
                WHERE q.quiz_id = ?
                GROUP BY q.id, ao.id
                ORDER BY q.question_order, ao.option_order
            `, [id, id, id]);
            
            res.json({
                quiz: {
                    id: quiz.id,
                    title: quiz.title,
                    totalSubmissions: results.length
                },
                results: results,
                answerStatistics: answerStats
            });
            
        } catch (error) {
            next(error);
        }
    }

    // Create quiz from template (professor only)
    static async createFromTemplate(req, res, next) {
        try {
            const { templateId, title, classId, deadline, timeLimit } = req.body;
            
            // Validate required fields
            ErrorHandler.validateRequired(['templateId', 'title', 'classId'], req.body);
            
            // Check if template belongs to professor
            const template = await database.findOne('quiz_templates', { 
                id: templateId, 
                professor_id: req.user.id 
            });
            
            if (!template) {
                throw ErrorHandler.notFoundError('Quiz template not found');
            }
            
            // Check if class belongs to professor
            const classData = await database.findOne('classes', { 
                id: classId, 
                professor_id: req.user.id,
                is_active: true 
            });
            
            if (!classData) {
                throw ErrorHandler.notFoundError('Class not found or you do not have permission');
            }
            
            // Get original quiz data
            const originalQuiz = await database.findById('quizzes', template.original_quiz_id);
            if (!originalQuiz) {
                throw ErrorHandler.notFoundError('Original quiz not found');
            }
            
            // Get questions and options from original quiz
            const questionsData = await database.query(`
                SELECT q.*, ao.id as option_id, ao.option_text, ao.option_order, ao.is_correct
                FROM questions q
                LEFT JOIN answer_options ao ON q.id = ao.question_id
                WHERE q.quiz_id = ?
                ORDER BY q.question_order, ao.option_order
            `, [originalQuiz.id]);
            
            // Validate deadline if provided
            let deadlineDate = null;
            if (deadline) {
                deadlineDate = ErrorHandler.validateFutureDate(deadline, 'deadline');
            }
            
            // Create new quiz from template
            const result = await database.transaction(async (connection) => {
                // Insert new quiz
                const [quizResult] = await connection.execute(
                    `INSERT INTO quizzes (title, description, class_id, professor_id, deadline, time_limit_minutes) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [title, originalQuiz.description, classId, req.user.id, deadlineDate, timeLimit || originalQuiz.time_limit_minutes]
                );
                
                const newQuizId = quizResult.insertId;
                
                // Group questions and their options
                const questionsMap = new Map();
                questionsData.forEach(row => {
                    if (!questionsMap.has(row.id)) {
                        questionsMap.set(row.id, {
                            ...row,
                            options: []
                        });
                    }
                    
                    if (row.option_id) {
                        questionsMap.get(row.id).options.push({
                            id: row.option_id,
                            text: row.option_text,
                            order: row.option_order,
                            isCorrect: row.is_correct
                        });
                    }
                });
                
                // Insert questions and options
                for (const question of questionsMap.values()) {
                    const [questionResult] = await connection.execute(
                        `INSERT INTO questions (quiz_id, question_text, question_type, question_order, points) 
                         VALUES (?, ?, ?, ?, ?)`,
                        [newQuizId, question.question_text, question.question_type, question.question_order, question.points]
                    );
                    
                    const newQuestionId = questionResult.insertId;
                    
                    // Insert options
                    for (const option of question.options) {
                        await connection.execute(
                            `INSERT INTO answer_options (question_id, option_text, option_order, is_correct) 
                             VALUES (?, ?, ?, ?)`,
                            [newQuestionId, option.text, option.order, option.isCorrect]
                        );
                    }
                }
                
                return newQuizId;
            });
            
            // Log quiz creation from template
            await AuditLogger.logUserAction(
                req.user.id,
                'QUIZ_CREATE_FROM_TEMPLATE',
                'quizzes',
                result,
                { template_id: templateId },
                { title, class_id: classId },
                req
            );
            
            res.status(201).json({
                message: 'Quiz created from template successfully',
                quiz: {
                    id: result,
                    title: title,
                    classId: classId,
                    templateId: templateId
                }
            });
            
        } catch (error) {
            next(error);
        }
    }
}

// Quiz routes
router.get('/', AuthMiddleware.verifyToken, ErrorHandler.asyncHandler(QuizController.getAllQuizzes));
router.get('/available', AuthMiddleware.verifyToken, AuthMiddleware.requireStudent, ErrorHandler.asyncHandler(QuizController.getAvailableQuizzes));
router.get('/:id', AuthMiddleware.verifyToken, ErrorHandler.asyncHandler(QuizController.getQuizById));
router.post('/', AuthMiddleware.verifyToken, AuthMiddleware.requireProfessor, ErrorHandler.asyncHandler(QuizController.createQuiz));
router.put('/:id', AuthMiddleware.verifyToken, AuthMiddleware.requireProfessor, ErrorHandler.asyncHandler(QuizController.updateQuiz));
router.delete('/:id', AuthMiddleware.verifyToken, AuthMiddleware.requireProfessor, ErrorHandler.asyncHandler(QuizController.deleteQuiz));
router.post('/from-template', AuthMiddleware.verifyToken, AuthMiddleware.requireProfessor, ErrorHandler.asyncHandler(QuizController.createFromTemplate));
router.get('/:id/results', AuthMiddleware.verifyToken, AuthMiddleware.requireProfessor, ErrorHandler.asyncHandler(QuizController.getQuizResults));

module.exports = router; 