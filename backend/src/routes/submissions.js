const express = require("express");
const router = express.Router();

const database = require("../config/database");
const AuthMiddleware = require("../middleware/auth");
const ErrorHandler = require("../middleware/errorHandler");
const AuditLogger = require("../middleware/auditLogger");

class SubmissionController {
  // Start quiz (student only)
  static async startQuiz(req, res, next) {
    try {
      const { quizId } = req.body;

      // Validate required fields
      ErrorHandler.validateRequired(["quizId"], req.body);

      // Get quiz details
      const quiz = await database.query(
        `
                SELECT q.*, c.name as class_name
                FROM quizzes q
                JOIN classes c ON q.class_id = c.id
                WHERE q.id = ? AND q.is_active = true
            `,
        [quizId]
      );

      if (quiz.length === 0) {
        throw ErrorHandler.notFoundError("Quiz not found");
      }

      const quizInfo = quiz[0];

      // Check if student is enrolled in the class
      const enrollment = await database.findOne("class_enrollments", {
        class_id: quizInfo.class_id,
        student_id: req.user.id,
        is_active: true,
      });

      if (!enrollment) {
        throw ErrorHandler.forbiddenError(
          "You are not enrolled in the class for this quiz"
        );
      }

      // Check if quiz deadline has passed
      if (quizInfo.deadline && new Date() > new Date(quizInfo.deadline)) {
        throw ErrorHandler.forbiddenError("Quiz deadline has passed");
      }

      // Check if student has already submitted this quiz
      const existingSubmission = await database.findOne("quiz_submissions", {
        quiz_id: quizId,
        student_id: req.user.id,
      });

      if (existingSubmission) {
        if (existingSubmission.is_completed) {
          throw ErrorHandler.conflictError(
            "You have already completed this quiz"
          );
        } else {
          // Return existing submission
          const timeElapsed = Math.floor(
            (new Date() - new Date(existingSubmission.started_at)) / 60000
          );
          const timeRemaining = Math.max(
            0,
            quizInfo.time_limit_minutes - timeElapsed
          );

          if (timeRemaining <= 0) {
            // Time is up, auto-submit
            await SubmissionController.autoSubmitQuiz(
              existingSubmission.id,
              req
            );
            throw ErrorHandler.forbiddenError("Quiz time has expired");
          }

          return res.json({
            message: "Quiz session resumed",
            submission: {
              id: existingSubmission.id,
              quizId: quizId,
              startedAt: existingSubmission.started_at,
              timeRemaining: timeRemaining,
            },
          });
        }
      }

      // Create new submission
      const result = await database.insert("quiz_submissions", {
        quiz_id: quizId,
        student_id: req.user.id,
        ip_address: req.ip,
      });

      // Log quiz start
      await AuditLogger.logQuizActivity(
        req.user.id,
        "START",
        quizId,
        result.insertId,
        { quiz_title: quizInfo.title },
        req
      );

      res.status(201).json({
        message: "Quiz started successfully",
        submission: {
          id: result.insertId,
          quizId: quizId,
          startedAt: new Date(),
          timeRemaining: quizInfo.time_limit_minutes,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ...existing code...

  // Submit answer for a question
  static async submitAnswer(req, res, next) {
    try {
      const { submissionId, questionId, selectedOptionId } = req.body;

      // Validate required fields
      ErrorHandler.validateRequired(
        ["submissionId", "questionId", "selectedOptionId"],
        req.body
      );

      // Get submission details
      const submission = await database.query(
        `
                SELECT qs.*, q.title as quiz_title, q.time_limit_minutes
                FROM quiz_submissions qs
                JOIN quizzes q ON qs.quiz_id = q.id
                WHERE qs.id = ? AND qs.student_id = ?
            `,
        [submissionId, req.user.id]
      );

      if (submission.length === 0) {
        throw ErrorHandler.notFoundError("Submission not found");
      }

      const submissionInfo = submission[0];

      if (submissionInfo.is_completed) {
        throw ErrorHandler.forbiddenError("Quiz has already been completed");
      }

      // Check if time limit exceeded
      const timeElapsed = Math.floor(
        (new Date() - new Date(submissionInfo.started_at)) / 60000
      );
      if (timeElapsed >= submissionInfo.time_limit_minutes) {
        // Auto-submit the quiz
        await SubmissionController.autoSubmitQuiz(submissionId, req);
        throw ErrorHandler.forbiddenError("Quiz time has expired");
      }

      // Validate question belongs to the quiz
      const question = await database.query(
        `
                SELECT q.*, ao.is_correct
                FROM questions q
                LEFT JOIN answer_options ao ON ao.id = ? AND ao.question_id = q.id
                WHERE q.id = ? AND q.quiz_id = ?
            `,
        [selectedOptionId, questionId, submissionInfo.quiz_id]
      );

      if (question.length === 0) {
        throw ErrorHandler.validationError("Invalid question or option");
      }

      const questionInfo = question[0];
      const isCorrect = questionInfo.is_correct || false;

      // Check if answer already exists
      const existingAnswer = await database.findOne("student_answers", {
        submission_id: submissionId,
        question_id: questionId,
      });

     if (existingAnswer) {
    // Update existing answer
    await database.update(
      "student_answers",
      {
        selected_option_id: selectedOptionId,
        is_correct: isCorrect,
        answered_at: new Date(),
      },
      {
        submission_id: submissionId,
        question_id: questionId,
      }
    );
    console.log('Answer updated for question:', questionId, 'submission:', submissionId);
    
    // Emit socket event for answer updates - using global broadcast
    if (global.io) {
      console.log('Emitting global socket event for answer update - quiz:', submissionInfo.quiz_id);
      global.io.emit('quizResultsUpdated', {
        quizId: submissionInfo.quiz_id,
        questionId: questionId,
        submissionId: submissionId,
        type: 'answer_updated'
      });
    }
} else {
    // Insert new answer
    await database.insert("student_answers", {
      submission_id: submissionId,
      question_id: questionId,
      selected_option_id: selectedOptionId,
      is_correct: isCorrect,
      answered_at: new Date(),
    });
    console.log('New answer inserted for question:', questionId, 'submission:', submissionId);
    
    // Emit socket event for new answers - using global broadcast
    if (global.io) {
      console.log('Emitting global socket event for new answer - quiz:', submissionInfo.quiz_id);
      global.io.emit('quizResultsUpdated', {
        quizId: submissionInfo.quiz_id,
        questionId: questionId,
        submissionId: submissionId,
        type: 'answer_submitted'
      });
    }
}

      res.json({
        message: "Answer submitted successfully",
        answer: {
          questionId: questionId,
          selectedOptionId: selectedOptionId,
          submittedAt: new Date(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

// ...existing code...

  // Complete quiz submission
  static async completeQuiz(req, res, next) {
    try {
      const { submissionId } = req.body;

      // Validate required fields
      ErrorHandler.validateRequired(["submissionId"], req.body);

      // Get submission details
      const submission = await database.query(
        `
                SELECT qs.*, q.title as quiz_title, q.show_results_after_submission
                FROM quiz_submissions qs
                JOIN quizzes q ON qs.quiz_id = q.id
                WHERE qs.id = ? AND qs.student_id = ?
            `,
        [submissionId, req.user.id]
      );

      if (submission.length === 0) {
        throw ErrorHandler.notFoundError("Submission not found");
      }

      const submissionInfo = submission[0];

      if (submissionInfo.is_completed) {
        throw ErrorHandler.forbiddenError("Quiz has already been completed");
      }

      // Calculate score and time taken
      const timeElapsed = Math.floor(
        (new Date() - new Date(submissionInfo.started_at)) / 60000
      );

      const scoreData = await database.query(
        `
                SELECT 
                    COUNT(*) as total_questions,
                    SUM(q.points) as max_score,
                    COALESCE(SUM(CASE WHEN sa.is_correct THEN q.points ELSE 0 END), 0) as total_score
                FROM questions q
                LEFT JOIN student_answers sa ON q.id = sa.question_id AND sa.submission_id = ?
                WHERE q.quiz_id = ?
            `,
        [submissionId, submissionInfo.quiz_id]
      );

      const score = scoreData[0];

      // Update submission as completed
      await database.update(
        "quiz_submissions",
        {
          is_completed: true,
          submitted_at: new Date(),
          time_taken_minutes: timeElapsed,
          total_score: score.total_score,
          max_score: score.max_score,
        },
        { id: submissionId }
      );

      // Log quiz completion
      await AuditLogger.logQuizActivity(
        req.user.id,
        "COMPLETE",
        submissionInfo.quiz_id,
        submissionId,
        {
          score: score.total_score,
          max_score: score.max_score,
          time_taken: timeElapsed,
        },
        req
      );

      // Emit Socket.IO event for real-time update
if (global.io) {
    console.log("Emitting quizResultsUpdated", submissionInfo.quiz_id); // <-- CORRECT
    global.io.emit('quizResultsUpdated', { quizId: submissionInfo.quiz_id });
}

      const response = {
        message: "Quiz completed successfully",
        result: {
          submissionId: submissionId,
          score: score.total_score,
          maxScore: score.max_score,
          percentage: Math.round((score.total_score / score.max_score) * 100),
          timeTaken: timeElapsed,
          submittedAt: new Date(),
        },
      };

      // Include detailed results if quiz allows
      if (submissionInfo.show_results_after_submission) {
        const detailedResults = await SubmissionController.getSubmissionDetails(
          submissionId
        );
        response.detailedResults = detailedResults;
      }

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get submission results
  static async getSubmissionResults(req, res, next) {
    try {
      const { id } = req.params;

      // Get submission details
      const submission = await database.query(
        `
                SELECT qs.*, q.title as quiz_title, q.show_results_after_submission,
                       c.name as class_name, u.first_name, u.last_name
                FROM quiz_submissions qs
                JOIN quizzes q ON qs.quiz_id = q.id
                JOIN classes c ON q.class_id = c.id
                JOIN users u ON q.professor_id = u.id
                WHERE qs.id = ? AND qs.student_id = ? AND qs.is_completed = true
            `,
        [id, req.user.id]
      );

      if (submission.length === 0) {
        throw ErrorHandler.notFoundError("Submission not found");
      }

      const submissionInfo = submission[0];

      const result = {
        id: submissionInfo.id,
        quizTitle: submissionInfo.quiz_title,
        className: submissionInfo.class_name,
        professorName: `${submissionInfo.first_name} ${submissionInfo.last_name}`,
        startedAt: submissionInfo.started_at,
        submittedAt: submissionInfo.submitted_at,
        timeTaken: submissionInfo.time_taken_minutes,
        score: submissionInfo.total_score,
        maxScore: submissionInfo.max_score,
        percentage: Math.round(
          (submissionInfo.total_score / submissionInfo.max_score) * 100
        ),
      };

      // Include detailed results if quiz allows or if explicitly requested by professor/admin
      if (submissionInfo.show_results_after_submission) {
        const detailedResults = await SubmissionController.getSubmissionDetails(
          id
        );
        result.detailedResults = detailedResults;
      }

      res.json({
        submission: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all submissions for a student
  // Get all submissions for a student
  // Get all submissions for a student
  static async getStudentSubmissions(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const parsedLimit = parseInt(limit);
      const parsedPage = parseInt(page);
      const offset = (parsedPage - 1) * parsedLimit;

      // Embed LIMIT and OFFSET directly into the SQL string
      const query = `
            SELECT qs.id, qs.started_at, qs.submitted_at, qs.time_taken_minutes,
                   qs.total_score, qs.max_score, qs.is_completed,
                   q.title as quiz_title, c.name as class_name,
                   u.first_name, u.last_name,
                   ROUND((qs.total_score / qs.max_score) * 100, 2) as percentage
            FROM quiz_submissions qs
            JOIN quizzes q ON qs.quiz_id = q.id
            JOIN classes c ON q.class_id = c.id
            JOIN users u ON q.professor_id = u.id
            WHERE qs.student_id = ? AND qs.is_completed = true
            ORDER BY qs.submitted_at DESC
            LIMIT ${parsedLimit} OFFSET ${offset}
        `;

      const submissions = await database.query(query, [req.user.id]);

      res.json({
        submissions: submissions,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get poll results for a quiz (after submission)
  static async getPollResults(req, res, next) {
    try {
      const { quizId } = req.params;

      // Check if student has submitted this quiz
      const submission = await database.findOne("quiz_submissions", {
        quiz_id: quizId,
        student_id: req.user.id,
        is_completed: true,
      });

      if (!submission) {
        throw ErrorHandler.forbiddenError(
          "You must complete the quiz to see poll results"
        );
      }

      // Get poll statistics
      const pollResults = await database.query(
        `
                SELECT 
                    q.id as question_id, q.question_text, q.question_order,
                    ao.id as option_id, ao.option_text, ao.option_order,
                    COUNT(sa.id) as vote_count,
                    ROUND((COUNT(sa.id) / (
                        SELECT COUNT(*) 
                        FROM quiz_submissions 
                        WHERE quiz_id = ? AND is_completed = true
                    )) * 100, 2) as percentage
                FROM questions q
                LEFT JOIN answer_options ao ON q.id = ao.question_id
                LEFT JOIN student_answers sa ON ao.id = sa.selected_option_id
                LEFT JOIN quiz_submissions qs ON sa.submission_id = qs.id AND qs.quiz_id = ?
                WHERE q.quiz_id = ?
                GROUP BY q.id, ao.id
                ORDER BY q.question_order, ao.option_order
            `,
        [quizId, quizId, quizId]
      );

      // Group results by question
      const questionsMap = new Map();
      pollResults.forEach((row) => {
        if (!questionsMap.has(row.question_id)) {
          questionsMap.set(row.question_id, {
            id: row.question_id,
            text: row.question_text,
            order: row.question_order,
            options: [],
          });
        }

        if (row.option_id) {
          questionsMap.get(row.question_id).options.push({
            id: row.option_id,
            text: row.option_text,
            order: row.option_order,
            voteCount: row.vote_count,
            percentage: row.percentage,
          });
        }
      });

      res.json({
        quizId: quizId,
        questions: Array.from(questionsMap.values()),
      });
    } catch (error) {
      next(error);
    }
  }

  // Get quiz submission status for a student
  static async getQuizStatus(req, res, next) {
    try {
      const { quizId } = req.params;

      // Get submission details for the current user
      const submission = await database.findOne("quiz_submissions", {
        quiz_id: quizId,
        student_id: req.user.id,
      });

      if (!submission) {
        return res.json({
          submission: null,
          status: "not_started",
        });
      }

      res.json({
        submission: submission,
        status: submission.is_completed ? "completed" : "in_progress",
      });
    } catch (error) {
      next(error);
    }
  }

  // Helper method to auto-submit quiz when time expires
  static async autoSubmitQuiz(submissionId, req) {
    try {
      const submission = await database.findById(
        "quiz_submissions",
        submissionId
      );
      if (!submission || submission.is_completed) {
        return;
      }

      const timeElapsed = Math.floor(
        (new Date() - new Date(submission.started_at)) / 60000
      );

      const scoreData = await database.query(
        `
                SELECT 
                    COUNT(*) as total_questions,
                    SUM(q.points) as max_score,
                    COALESCE(SUM(CASE WHEN sa.is_correct THEN q.points ELSE 0 END), 0) as total_score
                FROM questions q
                LEFT JOIN student_answers sa ON q.id = sa.question_id AND sa.submission_id = ?
                WHERE q.quiz_id = ?
            `,
        [submissionId, submission.quiz_id]
      );

      const score = scoreData[0];

      await database.update(
        "quiz_submissions",
        {
          is_completed: true,
          submitted_at: new Date(),
          time_taken_minutes: timeElapsed,
          total_score: score.total_score,
          max_score: score.max_score,
        },
        { id: submissionId }
      );

      // Log auto-submission
      await AuditLogger.logQuizActivity(
        submission.student_id,
        "AUTO_SUBMIT",
        submission.quiz_id,
        submissionId,
        { reason: "Time expired" },
        req
      );
    } catch (error) {
      console.error("Auto-submit error:", error);
    }
  }

  // Helper method to get detailed submission results
  static async getSubmissionDetails(submissionId) {
    const details = await database.query(
      `
            SELECT 
                q.id as question_id, q.question_text, q.question_order, q.points,
                sa.selected_option_id, sa.is_correct,
                ao.option_text as selected_option_text,
                correct_ao.option_text as correct_option_text
            FROM questions q
            LEFT JOIN student_answers sa ON q.id = sa.question_id AND sa.submission_id = ?
            LEFT JOIN answer_options ao ON sa.selected_option_id = ao.id
            LEFT JOIN answer_options correct_ao ON q.id = correct_ao.question_id AND correct_ao.is_correct = true
            WHERE q.quiz_id = (SELECT quiz_id FROM quiz_submissions WHERE id = ?)
            ORDER BY q.question_order
        `,
      [submissionId, submissionId]
    );

    return details;
  }
}

// Submission routes
router.post(
  "/start",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireStudent,
  ErrorHandler.asyncHandler(SubmissionController.startQuiz)
);
router.post(
  "/answer",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireStudent,
  ErrorHandler.asyncHandler(SubmissionController.submitAnswer)
);
router.post(
  "/complete",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireStudent,
  ErrorHandler.asyncHandler(SubmissionController.completeQuiz)
);
router.get(
  "/my-submissions",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireStudent,
  ErrorHandler.asyncHandler(SubmissionController.getStudentSubmissions)
);
router.get(
  "/:id",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireStudent,
  ErrorHandler.asyncHandler(SubmissionController.getSubmissionResults)
);
router.get(
  "/quiz/:quizId/status",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireStudent,
  ErrorHandler.asyncHandler(SubmissionController.getQuizStatus)
);
router.get(
  "/poll-results/:quizId",
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireStudent,
  ErrorHandler.asyncHandler(SubmissionController.getPollResults)
);

module.exports = router;
