import React, { useState, useEffect, useRef, useCallback } from 'react';
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

    // Refs to maintain current state for timer callbacks
    const currentQuestionIndexRef = useRef(currentQuestionIndex);
    const answersRef = useRef(answers);
    const submissionRef = useRef(submission);
    const quizRef = useRef(quiz);

    // Update refs when state changes
    useEffect(() => {
        currentQuestionIndexRef.current = currentQuestionIndex;
    }, [currentQuestionIndex]);

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        submissionRef.current = submission;
    }, [submission]);

    useEffect(() => {
        quizRef.current = quiz;
    }, [quiz]);

    // Consolidated socket emission function
    const emitLiveAnswer = useCallback((questionId, optionId, isTimeExpired = false) => {
        if (optionId == null || optionId === undefined) {
            console.log('No answer to emit for question:', questionId);
            return;
        }

        const currentQuestion = quiz?.questions?.find(q => q.id === questionId);
        if (!currentQuestion) {
            console.log('Question not found for socket emission:', questionId);
            return;
        }

        // Find the selected option
        const selectedOption = currentQuestion.options?.find(opt => 
            opt.id === optionId || opt.id === parseInt(optionId) || opt.id === String(optionId)
        );

        // Get option text
        let optionText = 'Unknown option';
        if (selectedOption) {
            optionText = selectedOption.option_text || selectedOption.text || `Option ${optionId}`;
        }

        // Emit live answer update via socket
        socket.emit('live_answer_update', {
            studentId: user.id,
            studentName: user.full_name || user.email,
            quizId: parseInt(quizId),
            questionId: questionId,
            selectedOptionId: optionId,
            optionText: optionText,
            questionText: currentQuestion.question_text || `Question ${questionId}`,
            timestamp: Date.now(),
            isTimeExpired: isTimeExpired
        });

        console.log('📡 Live answer emitted:', { questionId, optionId, optionText });
    }, [quiz, user, quizId]);

    useEffect(() => {
        if (quizId) {
            startQuiz();
        }
        
        // Socket setup for real-time communication
        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            socket.emit('join_quiz_room', quizId);
        });
        
        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });
        
        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
        
        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
        };
    }, [quizId]);

    // Per-question timer effect
    useEffect(() => {
        if (!quiz || !quiz.questions || !quiz.questions[currentQuestionIndex]) return;

        const currentQuestion = quiz.questions[currentQuestionIndex];
        const timeLimit = currentQuestion.questionTimeLimit || 30;
        console.log('Timer setup for question:', currentQuestion.id, 'Time limit:', timeLimit);
        setQuestionTimeLeft(timeLimit);

        if (questionTimerRef.current) clearInterval(questionTimerRef.current);

        questionTimerRef.current = setInterval(() => {
            setQuestionTimeLeft(prev => {
                const newTime = prev - 1;
                
                if (newTime <= 0) {
                    console.log('Timer expired for question:', currentQuestion.id);
                    clearInterval(questionTimerRef.current);
                    handleTimeExpired();
                    return 0;
                }
                return newTime;
            });
        }, 1000);

        return () => {
            if (questionTimerRef.current) {
                clearInterval(questionTimerRef.current);
            }
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

    const handleTimeExpired = useCallback(async () => {
        console.log('Timer expired! Processing...');
        
        // Use refs to get current state
        const currentQuestionIdx = currentQuestionIndexRef.current;
        const currentAnswers = answersRef.current;
        const currentQuiz = quizRef.current;
        
        if (!currentQuiz || !currentQuiz.questions || !currentQuiz.questions[currentQuestionIdx]) {
            console.log('Invalid quiz state on timer expiry');
            return;
        }
        
        const currentQuestion = currentQuiz.questions[currentQuestionIdx];
        const answer = currentAnswers[currentQuestion.id];

        // Send final answer via socket if exists
        if (answer != null && answer !== undefined) {
            emitLiveAnswer(currentQuestion.id, answer, true);
        }

        // Small delay to ensure socket transmission
        setTimeout(() => {
            // Check if this was the last question
            if (currentQuestionIdx >= currentQuiz.questions.length - 1) {
                console.log('Timer expired on last question - showing submission dialog');
                setShowConfirmSubmit(true);
            } else {
                console.log('Moving to next question after timer expiry');
                setCurrentQuestionIndex(currentQuestionIdx + 1);
            }
        }, 100);
    }, [emitLiveAnswer]);

    const handleAnswerSelect = (questionId, optionId) => {
        // Update local state only
        const newAnswers = {
            ...answers,
            [questionId]: optionId
        };
        
        setAnswers(newAnswers);
        console.log('Answer selected for question:', questionId, 'option:', optionId);
        
        // Emit live answer update immediately
        emitLiveAnswer(questionId, optionId);
    };

    const handleNextQuestion = () => {
        if (!quiz || !quiz.questions || currentQuestionIndex >= quiz.questions.length) {
            console.error('Cannot proceed to next question: invalid quiz state');
            return;
        }
        
        const currentQuestion = quiz.questions[currentQuestionIndex];
        if (!currentQuestion) {
            console.error('Current question is undefined');
            return;
        }
        
        const answer = answers[currentQuestion.id];

        // Send answer via socket before navigation
        if (answer != null && answer !== undefined) {
            emitLiveAnswer(currentQuestion.id, answer);
        }

        // Move to next question
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handlePreviousQuestion = () => {
        if (!quiz || !quiz.questions || currentQuestionIndex >= quiz.questions.length) {
            console.error('Cannot go to previous question: invalid quiz state');
            return;
        }
        
        const currentQuestion = quiz.questions[currentQuestionIndex];
        if (!currentQuestion) {
            console.error('Current question is undefined');
            return;
        }
        
        const answer = answers[currentQuestion.id];

        // Send answer via socket before navigation
        if (answer != null && answer !== undefined) {
            emitLiveAnswer(currentQuestion.id, answer);
        }

        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const handleQuestionJump = (index) => {
        const currentQuestion = quiz.questions[currentQuestionIndex];
        const answer = answers[currentQuestion.id];

        // Send answer via socket before jumping
        if (answer !== undefined && answer !== '') {
            emitLiveAnswer(currentQuestion.id, answer);
        }

        setCurrentQuestionIndex(index);
    };

    const handleCompleteQuiz = async () => {
        try {
            setSubmitting(true);
            
            console.log('Completing quiz with all answers...');
            
            // Use the complete-with-answers endpoint that saves all answers to DB at once
            const response = await api.post('/submissions/complete-with-answers', {
                quizId: parseInt(quizId),
                answers: answers
            });
            
            console.log('Quiz completed successfully!', response.data);
            
            // Show success message
            alert(`Quiz completed successfully! Your score: ${response.data.submission.score}%`);
            
            // Navigate to student quizzes page
            navigate('/student/quizzes');
            
        } catch (err) {
            console.error('Failed to complete quiz:', err);
            
            const errorMessage = err.response?.data?.message || err.message || 'Failed to complete quiz';
            setError(errorMessage);
            alert(`Error completing quiz: ${errorMessage}`);
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

    // Safety checks for quiz questions
    if (!quiz.questions || quiz.questions.length === 0) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    No questions found in this quiz.
                </div>
            </div>
        );
    }

    if (currentQuestionIndex >= quiz.questions.length) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Invalid question index.
                </div>
            </div>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    
    if (!currentQuestion) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Current question not found.
                </div>
            </div>
        );
    }

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
                                    {/* Per-question timer */}
                                    <div className="h4 mb-0 text-warning">
                                        <i className="fas fa-stopwatch me-2"></i>
                                        Time left: {questionTimeLeft}s
                                    </div>
                                    <small className="text-muted">Auto-moves when time expires</small>
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
                                        • Unanswered questions: {quiz.questions.length - Object.keys(answers).length}<br/>
                                        • Current question time: {questionTimeLeft}s remaining
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
