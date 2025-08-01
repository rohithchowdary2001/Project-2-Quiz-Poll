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
    const [questionTimeLeft, setQuestionTimeLeft] = useState(0); // per-question timer only
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

    useEffect(() => {
        if (quizId) {
            startQuiz();
        }
        
        // Add socket connection logging
        socket.on('connect', () => {
            console.log('Socket connected in QuizTaking:', socket.id);
        });
        
        socket.on('disconnect', () => {
            console.log('Socket disconnected in QuizTaking');
        });
        
        socket.on('connect_error', (error) => {
            console.error('Socket connection error in QuizTaking:', error);
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
    const timeLimit = currentQuestion.questionTimeLimit || 30; // Use camelCase field name
    console.log('Setting up timer for question:', currentQuestion.id, 'Time limit:', timeLimit, 'seconds');
    console.log('Question data:', currentQuestion); // Debug: show full question data
    setQuestionTimeLeft(timeLimit);

    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    questionTimerRef.current = setInterval(() => {
        setQuestionTimeLeft(prev => {
            const newTime = prev - 1;
            console.log('Question timer tick - Time left:', newTime, 'seconds for question:', currentQuestion.id);
            
            if (newTime <= 0) {
                console.log('⏰ TIMER EXPIRED! Calling handleTimeExpired for question:', currentQuestion.id);
                clearInterval(questionTimerRef.current);
                // Auto-move to next question or submit quiz
                handleTimeExpired();
                return 0;
            }
            return newTime;
        });
    }, 1000);

    return () => {
        if (questionTimerRef.current) {
            console.log('Cleaning up timer for question:', currentQuestion.id);
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
        console.log('🚨 Timer expired! Getting current state from refs...');
        
        // Use refs to get current state (avoiding stale closure)
        const currentQuestionIdx = currentQuestionIndexRef.current;
        const currentAnswers = answersRef.current;
        const currentSubmission = submissionRef.current;
        const currentQuiz = quizRef.current;
        
        if (!currentQuiz || !currentQuiz.questions || !currentQuiz.questions[currentQuestionIdx]) {
            console.log('No current question found, quiz:', !!currentQuiz, 'questions:', !!currentQuiz?.questions, 'index:', currentQuestionIdx);
            return;
        }
        
        const currentQuestion = currentQuiz.questions[currentQuestionIdx];
        const answer = currentAnswers[currentQuestion.id];

        console.log('Timer expired! Current question:', currentQuestion.id, 'Answer:', answer, 'Type:', typeof answer);
        console.log('Current answers state:', currentAnswers);
        console.log('Current question index:', currentQuestionIdx);

        // Submit current answer if it exists (check for valid option ID)
        if (currentSubmission && answer != null && answer !== undefined) {
            try {
                console.log('Auto-submitting answer on time expiry for question:', currentQuestion.id, 'answer:', answer);
                
                const response = await api.post('/submissions/answer', {
                    submissionId: currentSubmission.id,
                    questionId: currentQuestion.id,
                    selectedOptionId: answer
                });
                
                console.log('✅ Auto-submitted answer successfully for question:', currentQuestion.id, 'Response:', response.data);
            } catch (err) {
                console.error('❌ Failed to auto-submit answer:', err.response?.data || err.message);
            }
        } else {
            console.log('⚠️ No answer to auto-submit for question:', currentQuestion.id, 'Answer value:', answer, 'Type:', typeof answer);
        }

        // Small delay to ensure submission is processed
        await new Promise(resolve => setTimeout(resolve, 100));

        // Move to next question or complete quiz
        if (currentQuestionIdx === currentQuiz.questions.length - 1) {
            // Last question - auto-submit quiz (skip final answer submission since we just did it)
            console.log('Time expired on last question, completing quiz (skipping duplicate answer submission)');
            handleCompleteQuiz(true); // Skip final answer submission
        } else {
            // Move to next question
            console.log('Time expired, moving to next question:', currentQuestionIdx + 1);
            setCurrentQuestionIndex(currentQuestionIdx + 1);
        }
    }, []); // Empty dependency array since we're using refs

    const handleAnswerSelect = async (questionId, optionId) => {
        // Just update local state - don't submit to server yet
        const newAnswers = {
            ...answers,
            [questionId]: optionId
        };
        
        setAnswers(newAnswers);
        
        console.log('Answer selected locally for question:', questionId, 'option:', optionId, 'type:', typeof optionId);
        console.log('Updated answers state:', newAnswers);
    };

    const handleNextQuestion = async () => {
        const currentQuestion = quiz.questions[currentQuestionIndex];
        const answer = answers[currentQuestion.id];

        console.log('Next button clicked. Current question:', currentQuestion.id, 'Answer:', answer, 'Type:', typeof answer);

        // Submit the answer when moving to next question
        if (submission && answer != null && answer !== undefined) {
            try {
                console.log('Submitting answer when moving to next question:', currentQuestion.id, 'answer:', answer);
                
                await api.post('/submissions/answer', {
                    submissionId: submission.id,
                    questionId: currentQuestion.id,
                    selectedOptionId: answer
                });

                console.log('Answer submitted successfully for question:', currentQuestion.id);
            } catch (err) {
                console.error('Failed to submit answer:', err);
                setError(err.response?.data?.message || 'Failed to submit answer');
                return; // Don't move to next question if submission failed
            }
        } else {
            console.log('No answer to submit for question:', currentQuestion.id, 'Answer value:', answer, 'Type:', typeof answer);
        }

        // Move to next question
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handlePreviousQuestion = async () => {
        const currentQuestion = quiz.questions[currentQuestionIndex];
        const answer = answers[currentQuestion.id];

        console.log('Previous button clicked. Current question:', currentQuestion.id, 'Answer:', answer, 'Type:', typeof answer);

        // Submit the current question's answer before going back
        if (submission && answer != null && answer !== undefined) {
            try {
                console.log('Submitting answer before going to previous question:', currentQuestion.id);
                
                await api.post('/submissions/answer', {
                    submissionId: submission.id,
                    questionId: currentQuestion.id,
                    selectedOptionId: answer
                });

                console.log('Answer submitted successfully before going back');
            } catch (err) {
                console.error('Failed to submit answer before going back:', err);
                setError(err.response?.data?.message || 'Failed to submit answer');
            }
        } else {
            console.log('No answer to submit for question:', currentQuestion.id, 'Answer value:', answer, 'Type:', typeof answer);
        }

        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const handleQuestionJump = async (index) => {
        const currentQuestion = quiz.questions[currentQuestionIndex];
        const answer = answers[currentQuestion.id];

        // Submit the current question's answer before jumping
        if (submission && answer !== undefined && answer !== '') {
            try {
                console.log('Submitting answer before jumping from question:', currentQuestion.id, 'to question:', index + 1);
                
                await api.post('/submissions/answer', {
                    submissionId: submission.id,
                    questionId: currentQuestion.id,
                    selectedOptionId: answer
                });

                console.log('Answer submitted successfully before jumping');
            } catch (err) {
                console.error('Failed to submit answer before jumping:', err);
                setError(err.response?.data?.message || 'Failed to submit answer');
            }
        }

        setCurrentQuestionIndex(index);
    };

    const handleCompleteQuiz = async (skipFinalAnswerSubmission = false) => {
        try {
            setSubmitting(true);
            
            // Submit the current question's answer before completing the quiz (unless already submitted)
            if (!skipFinalAnswerSubmission && quiz && quiz.questions && quiz.questions[currentQuestionIndex]) {
                const currentQuestion = quiz.questions[currentQuestionIndex];
                const answer = answers[currentQuestion.id];
                
                console.log('Before completing quiz - submitting final answer for question:', currentQuestion.id, 'answer:', answer);
                
                if (submission && answer != null && answer !== undefined) {
                    try {
                        console.log('Submitting final answer before quiz completion:', currentQuestion.id, 'answer:', answer);
                        
                        await api.post('/submissions/answer', {
                            submissionId: submission.id,
                            questionId: currentQuestion.id,
                            selectedOptionId: answer
                        });
                        
                        console.log('Final answer submitted successfully for question:', currentQuestion.id);
                    } catch (err) {
                        console.error('Failed to submit final answer:', err);
                        // Continue with quiz completion even if final answer submission fails
                    }
                } else {
                    console.log('No final answer to submit for question:', currentQuestion.id, 'Answer value:', answer, 'Type:', typeof answer);
                }
            } else if (skipFinalAnswerSubmission) {
                console.log('Skipping final answer submission (already submitted by timer)');
            }
            
            // Small delay to ensure answer is processed
            await new Promise(resolve => setTimeout(resolve, 300));
            
            console.log('Completing quiz with submission ID:', submission.id);
            const response = await api.post('/submissions/complete', {
                submissionId: submission.id
            });
            
            console.log('✅ Quiz completed successfully!', response.data);
            alert(`Quiz completed! Your score: ${response.data.result.score}/${response.data.result.maxScore} (${response.data.result.percentage}%)`);
            navigate('/student/history');
        } catch (err) {
            console.error('❌ Failed to complete quiz:', err);
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
                                    <br />
                                    {/* TEST BUTTON - Remove in production */}
                                    <button
                                        className="btn btn-outline-warning btn-sm mt-1"
                                        onClick={() => {
                                            console.log('🧪 TEST: Manually triggering timer expiry');
                                            handleTimeExpired();
                                        }}
                                        style={{ fontSize: '11px' }}
                                    >
                                        Test Timer Expiry
                                    </button>
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