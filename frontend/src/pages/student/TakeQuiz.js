import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import socket from '../../services/socket';

const QuizTaking = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [quiz, setQuiz] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
    const questionTimerRef = useRef();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

    useEffect(() => {
        if (quizId) {
            startQuiz();
        }
    }, [quizId]);

useEffect(() => {
    if (!quiz) return;

    const timeLimit = quiz.questionTimeLimit || 30; // Use quiz-level time limit
    setQuestionTimeLeft(timeLimit);

    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    questionTimerRef.current = setInterval(() => {
        setQuestionTimeLeft(prev => {
            if (prev <= 1) {
                clearInterval(questionTimerRef.current);
                if (currentQuestionIndex === quiz.questions.length - 1) {
                    // Last question: auto-submit the quiz
                    handleCompleteQuiz();
                } else {
                    // Not last question: move to next question
                    setCurrentQuestionIndex(currentQuestionIndex + 1);
                }
                return 0;
            }
            return prev - 1;
        });
    }, 1000);

    return () => {
        if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
}, [currentQuestionIndex, quiz]);

    const startQuiz = async () => {
        try {
            setLoading(true);
            const startResponse = await api.post('/submissions/start', { quizId });
            setSubmission(startResponse.data.submission);
            const quizResponse = await api.get(`/quizzes/${quizId}`);
            setQuiz(quizResponse.data.quiz);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to start quiz');
            setTimeout(() => {
                navigate('/student/quizzes');
            }, 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = async (questionId, optionId) => {
        try {
            await api.post('/submissions/answer', {
                submissionId: submission.id,
                questionId: questionId,
                selectedOptionId: optionId
            });
            setAnswers({
                ...answers,
                [questionId]: optionId
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit answer');
        }
    };

    const handleNextQuestion = async () => {
        const currentQuestion = quiz.questions[currentQuestionIndex];
        const answer = answers[currentQuestion.id];

        // Only submit if an answer exists
        if (submission && answer !== undefined && answer !== '') {
            try {
                await api.post('/submissions/answer', {
                    submissionId: submission.id,
                    questionId: currentQuestion.id,
                    selectedOptionId: answer
                });

                socket.emit('studentAnswerUpdate', {
                    submissionId: submission.id,
                    quizId: quizId,
                    questionId: currentQuestion.id,
                    selectedOptionId: answer
                });
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to submit answer');
            }
        }

        // Move to next question
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handlePreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const handleQuestionJump = (index) => {
        setCurrentQuestionIndex(index);
    };

    const handleCompleteQuiz = async () => {
        try {
            setSubmitting(true);
            const response = await api.post('/submissions/complete', {
                submissionId: submission.id
            });
            alert(`Quiz completed! Your score: ${response.data.result.score}/${response.data.result.maxScore} (${response.data.result.percentage}%)`);
            navigate('/student/history');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to complete quiz');
        } finally {
            setSubmitting(false);
            setShowConfirmSubmit(false);
        }
    };

    const calculateProgress = () => {
        if (!quiz) return 0;
        const answered = Object.keys(answers).length;
        return Math.round((answered / quiz.questions.length) * 100);
    };

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="d-flex justify-content-center align-items-center min-vh-100">
                    <div className="text-center">
                        <div className="spinner-border text-primary mb-3" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p>Starting your quiz...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/student/quizzes')}>
                    Back to Quizzes
                </button>
            </div>
        );
    }

    if (!quiz || !submission) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Quiz not found or not accessible.
                </div>
            </div>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const progress = calculateProgress();

    return (
        <div className="container-fluid mt-4">
            {/* Quiz Header */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <div className="row align-items-center">
                                <div className="col-md-4">
                                    <h5 className="mb-0">{quiz.title}</h5>
                                    <small className="text-muted">{quiz.class_name}</small>
                                </div>
                                <div className="col-md-4 text-center">
                                    <div className="h4 mb-0">
                                        Question {currentQuestionIndex + 1} of {quiz.questions.length}
                                    </div>
                                    <div className="progress mt-2">
                                        <div 
                                            className="progress-bar" 
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <small className="text-muted">{progress}% completed</small>
                                </div>
                                <div className="col-md-4 text-end">
                                    {/* Per-question timer only */}
                                    <div className="h6 mt-2 text-warning">
                                        <i className="fas fa-stopwatch me-2"></i>
                                        Time left for this question: {questionTimeLeft}s
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* Question Navigation */}
                <div className="col-md-3">
                    <div className="card sticky-top">
                        <div className="card-header">
                            <h6 className="mb-0">Question Navigation</h6>
                        </div>
                        <div className="card-body">
                            <div className="row g-2">
                                {quiz.questions.map((question, index) => (
                                    <div key={question.id} className="col-4">
                                        <button
                                            className={`btn btn-sm w-100 ${
                                                index === currentQuestionIndex 
                                                    ? 'btn-primary' 
                                                    : answers[question.id] 
                                                        ? 'btn-success' 
                                                        : 'btn-outline-secondary'
                                            }`}
                                            onClick={() => handleQuestionJump(index)}
                                        >
                                            {index + 1}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 small">
                                <div className="d-flex align-items-center mb-1">
                                    <div className="btn btn-sm btn-success me-2" style={{ width: '20px', height: '20px' }}></div>
                                    <span>Answered</span>
                                </div>
                                <div className="d-flex align-items-center mb-1">
                                    <div className="btn btn-sm btn-primary me-2" style={{ width: '20px', height: '20px' }}></div>
                                    <span>Current</span>
                                </div>
                                <div className="d-flex align-items-center">
                                    <div className="btn btn-sm btn-outline-secondary me-2" style={{ width: '20px', height: '20px' }}></div>
                                    <span>Not answered</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Current Question */}
                <div className="col-md-9">
                    <div className="card">
                        <div className="card-header">
                            <h6 className="mb-0">Question {currentQuestionIndex + 1}</h6>
                        </div>
                        <div className="card-body">
                            <div className="mb-4">
                                <h5>{currentQuestion.questionText}</h5>
                                <small className="text-muted">
                                    Points: {currentQuestion.points} | 
                                    Type: {currentQuestion.questionType.replace('_', ' ')}
                                </small>
                            </div>

                            <div className="mb-4">
                                {currentQuestion.options.map((option, optionIndex) => (
                                    <div key={option.id} className="form-check mb-3">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name={`question_${currentQuestion.id}`}
                                            id={`option_${option.id}`}
                                            checked={answers[currentQuestion.id] === option.id}
                                            onChange={() => handleAnswerSelect(currentQuestion.id, option.id)}
                                        />
                                        <label className="form-check-label" htmlFor={`option_${option.id}`}>
                                            <span className="badge bg-light text-dark me-2">
                                                {String.fromCharCode(65 + optionIndex)}
                                            </span>
                                            {option.text}
                                        </label>
                                    </div>
                                ))}
                            </div>

                            {/* Navigation Buttons */}
                            <div className="d-flex justify-content-between align-items-center">
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={handlePreviousQuestion}
                                    disabled={currentQuestionIndex === 0}
                                >
                                    <i className="fas fa-chevron-left me-2"></i>
                                    Previous
                                </button>

                                <div className="text-center">
                                    <small className="text-muted">
                                        {Object.keys(answers).length} of {quiz.questions.length} questions answered
                                    </small>
                                </div>

                                {currentQuestionIndex === quiz.questions.length - 1 ? (
                                    <button
                                        className="btn btn-success"
                                        onClick={() => setShowConfirmSubmit(true)}
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-check me-2"></i>
                                                Submit Quiz
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleNextQuestion}
                                    >
                                        Next
                                        <i className="fas fa-chevron-right ms-2"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm Submit Modal */}
            {showConfirmSubmit && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Submit Quiz</h5>
                                <button type="button" className="btn-close" onClick={() => setShowConfirmSubmit(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to submit your quiz?</p>
                                <div className="alert alert-info">
                                    <small>
                                        <strong>Summary:</strong><br/>
                                        • Questions answered: {Object.keys(answers).length} of {quiz.questions.length}<br/>
                                        • Unanswered questions: {quiz.questions.length - Object.keys(answers).length}
                                    </small>
                                </div>
                                <p className="text-warning">
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    <strong>Warning:</strong> Once submitted, you cannot change your answers.
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowConfirmSubmit(false)}>
                                    Continue Quiz
                                </button>
                                <button type="button" className="btn btn-success" onClick={handleCompleteQuiz} disabled={submitting}>
                                    {submitting ? 'Submitting...' : 'Submit Quiz'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizTaking;