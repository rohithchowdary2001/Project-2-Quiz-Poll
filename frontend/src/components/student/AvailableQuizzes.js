import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import socket from '../../services/socket';

const AvailableQuizzes = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAvailableQuizzes();
        fetchEnrolledClasses();
        
        // Join user room for receiving personal notifications
        if (user?.id) {
            console.log(`📡 Joining user room: user_${user.id}`);
            socket.emit('join_user_room', user.id);
        } else {
            console.log(`⚠️ User not available for socket room join:`, user);
        }
    }, [user]);

    useEffect(() => {
        fetchAvailableQuizzes();
    }, [selectedClassId]);

    // Listen for live quiz activation/deactivation events (Pure Frontend Socket!)
    useEffect(() => {
        const handleQuizStatusChange = (data) => {
            console.log('🔄 SOCKET-ONLY: Quiz status changed:', data);
            
            // Update the specific quiz in our local state
            setQuizzes(prev => {
                const updated = prev.map(quiz => {
                    if (quiz.id === data.quizId) {
                        console.log(`🔄 Live update for quiz ${data.quizId}:`, {
                            from: quiz.is_live_active,
                            fromType: typeof quiz.is_live_active,
                            to: data.isLiveActive,
                            toType: typeof data.isLiveActive
                        });
                        return { ...quiz, is_live_active: data.isLiveActive };
                    }
                    return quiz;
                });
                console.log(`📊 Updated quiz ${data.quizId} to ${data.isLiveActive ? 'ACTIVE' : 'PAUSED'}`);
                return updated;
            });
            
            // Show notification to user
            const statusMessage = data.isLiveActive 
                ? `🎉 "${data.quizTitle}" is now LIVE and available for taking!`
                : `⏸️ "${data.quizTitle}" has been PAUSED and is no longer available.`;
            
            alert(statusMessage);
            console.log(`📡 PURE FRONTEND: ${statusMessage}`);
        };

        // Ensure socket is connected before joining rooms
        const setupSocketListeners = () => {
            console.log('📡 Setting up SOCKET-ONLY listeners for quiz status changes (NO DATABASE!)');
            
            // Join class rooms for live updates with confirmation
            if (classes.length > 0) {
                classes.forEach(classItem => {
                    socket.emit('join_class_room', classItem.id);
                    console.log(`📡 Joined class room: ${classItem.id} for socket-only updates`);
                    
                    // Double-check: emit join again after a short delay to ensure connection
                    setTimeout(() => {
                        socket.emit('join_class_room', classItem.id);
                        console.log(`📡 Re-confirmed class room join: ${classItem.id}`);
                    }, 100);
                });
            } else {
                console.log('⚠️ WARNING: No classes found to join rooms for');
            }

            // Set up status change listener
            socket.on('quiz_live_status_change', handleQuizStatusChange);
            
            // Listen for room join confirmations
            socket.on('room_joined', (data) => {
                console.log(`✅ Successfully joined class room ${data.classId} with ${data.roomSize} total clients`);
            });
            
            // Test pong listener for debugging
            socket.on('test_pong', (data) => {
                console.log('🏓 STUDENT: Received pong from backend:', data);
            });
        };

        // If socket is connected, setup immediately
        if (socket.connected) {
            console.log('✅ Socket already connected, setting up listeners immediately');
            setupSocketListeners();
        } else {
            console.log('🔌 Socket not connected, forcing connection...');
            socket.connect();
        }

        // Also listen for connection events
        socket.on('connect', () => {
            console.log('✅ Socket connected in AvailableQuizzes:', socket.id);
            setupSocketListeners();
        });

        socket.on('disconnect', () => {
            console.log('❌ Socket disconnected in AvailableQuizzes');
        });

        // Listen for current quiz statuses when joining rooms
        socket.on('current_quiz_statuses', (statuses) => {
            console.log('📥 Received current quiz statuses from backend:', statuses);
            
            // Update quiz statuses based on received data
            setQuizzes(prev => {
                const updated = prev.map(quiz => {
                    const currentStatus = statuses.find(s => s.quizId === quiz.id);
                    if (currentStatus) {
                        console.log(`🔄 Updating quiz ${quiz.id} status:`, {
                            from: quiz.is_live_active,
                            fromType: typeof quiz.is_live_active,
                            to: currentStatus.isLiveActive,
                            toType: typeof currentStatus.isLiveActive
                        });
                        return { ...quiz, is_live_active: currentStatus.isLiveActive };
                    }
                    return quiz;
                });
                return updated;
            });
        });

        return () => {
            console.log('📡 Cleaning up socket-only listeners for quiz status changes');
            socket.off('quiz_live_status_change', handleQuizStatusChange);
            socket.off('current_quiz_statuses');
            socket.off('connect');
            socket.off('disconnect');
        };
    }, [classes]);

    const fetchAvailableQuizzes = async () => {
        try {
            console.log('AvailableQuizzes - Fetching available quizzes for student...');
            setLoading(true);
            const params = selectedClassId ? `?classId=${selectedClassId}&sortBy=deadline&sortOrder=ASC` : '?sortBy=deadline&sortOrder=ASC';
            const response = await api.get(`/quizzes${params}`);
            console.log('AvailableQuizzes - Quizzes fetched:', response.data);
            
            // Get submission status for each quiz
            const quizzesWithStatus = await Promise.all(
                (response.data.quizzes || []).map(async (quiz) => {
                    try {
                        const submissionResponse = await api.get(`/submissions/quiz/${quiz.id}/status`);
                        return {
                            ...quiz,
                            submission: submissionResponse.data.submission
                        };
                    } catch (err) {
                        // No submission found - quiz not started
                        return {
                            ...quiz,
                            submission: null
                        };
                    }
                })
            );
            
            setQuizzes(quizzesWithStatus);
            setError('');
        } catch (err) {
            console.error('AvailableQuizzes - Error fetching quizzes:', err);
            setError(err.response?.data?.message || 'Failed to fetch available quizzes');
            setQuizzes([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchEnrolledClasses = async () => {
        try {
            console.log('AvailableQuizzes - Fetching enrolled classes...');
            const response = await api.get('/classes');
            console.log('AvailableQuizzes - Classes fetched:', response.data);
            setClasses(response.data.classes || []);
        } catch (err) {
            console.error('AvailableQuizzes - Error fetching classes:', err);
        }
    };

    const startQuiz = (quizId) => {
        navigate(`/student/quiz/${quizId}`);
    };

    const viewPollResults = (quizId) => {
        navigate(`/student/poll-results/${quizId}`);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No deadline';
        return new Date(dateString).toLocaleString();
    };

    const getQuizStatus = (quiz) => {
        if (quiz.submission) {
            if (quiz.submission.is_completed) return 'Completed';
            return 'In Progress';
        }
        if (quiz.deadline && new Date(quiz.deadline) < new Date()) return 'Expired';
        return 'Available';
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Available': return 'bg-success';
            case 'In Progress': return 'bg-warning';
            case 'Completed': return 'bg-info';
            case 'Expired': return 'bg-danger';
            default: return 'bg-secondary';
        }
    };

    const canStartQuiz = (quiz) => {
        const status = getQuizStatus(quiz);
        // Handle MySQL BOOLEAN (0/1) and JavaScript boolean (true/false)
        const isLiveActive = !!quiz.is_live_active; // Convert any truthy value to boolean
        
        // Temporary debug logging to see what's happening
        if (quiz.id === 7) { // Assuming the quiz ID you're testing with
            console.log('🔍 DEBUG Quiz 7 canStartQuiz:', {
                quizId: quiz.id,
                status: status,
                is_live_active_raw: quiz.is_live_active,
                is_live_active_type: typeof quiz.is_live_active,
                isLiveActive: isLiveActive,
                canStart: status === 'Available' && isLiveActive
            });
        }
        
        return status === 'Available' && isLiveActive;
    };

    const canContinueQuiz = (quiz) => {
        const status = getQuizStatus(quiz);
        return status === 'In Progress';
    };

    const canViewResults = (quiz) => {
        const status = getQuizStatus(quiz);
        return status === 'Completed';
    };

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="d-flex justify-content-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Available Quizzes</h2>
                <div>
                    <button className="btn btn-primary me-2" onClick={fetchAvailableQuizzes}>
                        <i className="fas fa-sync-alt me-2"></i>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Class Filter */}
            <div className="row mb-4">
                <div className="col-md-4">
                    <select 
                        className="form-select" 
                        value={selectedClassId} 
                        onChange={(e) => setSelectedClassId(e.target.value)}
                    >
                        <option value="">All Classes</option>
                        {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>
                                {cls.name} ({cls.class_code})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
            )}

            {quizzes.length === 0 ? (
                <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    No quizzes available at this time. Check back later or contact your professors.
                </div>
            ) : (
                <div className="row">
                    {quizzes.map(quiz => {
                        const status = getQuizStatus(quiz);
                        return (
                            <div key={quiz.id} className="col-md-6 col-lg-4 mb-4">
                                <div className="card h-100">
                                    <div className="card-header d-flex justify-content-between align-items-center">
                                        <h5 className="mb-0">{quiz.title}</h5>
                                        <div className="d-flex flex-column align-items-end">
                                            <span className={`badge ${getStatusBadgeClass(status)} mb-1`}>
                                                {status}
                                            </span>
                                            <span className={`badge ${
                                                !!quiz.is_live_active 
                                                    ? 'bg-success' 
                                                    : 'bg-secondary'
                                            }`}>
                                                <i className={`fas ${
                                                    !!quiz.is_live_active 
                                                        ? 'fa-broadcast-tower' 
                                                        : 'fa-pause-circle'
                                                } me-1`}></i>
                                                {!!quiz.is_live_active ? 'Live' : 'Paused'}
                                                <small className="ms-1" title="Socket-only status, no database">⚡</small>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="card-body">
                                        <p className="card-text text-muted">{quiz.description}</p>
                                        
                                        <div className="mb-3">
                                            <small className="text-muted">
                                                <i className="fas fa-chalkboard-teacher me-1"></i>
                                                <strong>Class:</strong> {quiz.class_name}
                                            </small>
                                        </div>

                                        <div className="row text-center mb-3">
                                            <div className="col-4">
                                                <small className="text-muted">Questions</small>
                                                <div className="fw-bold">{quiz.question_count || 0}</div>
                                            </div>
                                            <div className="col-4">
                                                <small className="text-muted">Time Limit</small>
                                                <div className="fw-bold">
                                                    {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : 'No limit'}
                                                </div>
                                            </div>
                                            <div className="col-4">
                                                <small className="text-muted">Submissions</small>
                                                <div className="fw-bold">{quiz.submission_count || 0}</div>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <small className="text-muted">
                                                <i className="fas fa-clock me-1"></i>
                                                <strong>Deadline:</strong> {formatDate(quiz.deadline)}
                                            </small>
                                        </div>

                                        {quiz.submission && quiz.submission.is_completed && (
                                            <div className="mb-3">
                                                <div className="alert alert-success py-2">
                                                    <small>
                                                        <i className="fas fa-check-circle me-1"></i>
                                                        <strong>Your Score:</strong> {quiz.submission.total_score || 0}/{quiz.submission.max_score || 0} 
                                                        ({Math.round((quiz.submission.total_score / quiz.submission.max_score) * 100) || 0}%)
                                                    </small>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="card-footer">
                                        {canStartQuiz(quiz) && (
                                            <button 
                                                className="btn btn-success w-100"
                                                onClick={() => startQuiz(quiz.id)}
                                            >
                                                <i className="fas fa-play me-2"></i>
                                                Start Quiz
                                            </button>
                                        )}
                                        {getQuizStatus(quiz) === 'Available' && !quiz.is_live_active && (
                                            <div className="alert alert-warning mb-0 py-2">
                                                <small>
                                                    <i className="fas fa-pause-circle me-1"></i>
                                                    <strong>Quiz is paused by professor (Socket-Only ⚡).</strong> 
                                                    <br />Status updates in real-time - no database involved!
                                                </small>
                                            </div>
                                        )}
                                        {canContinueQuiz(quiz) && (
                                            <button 
                                                className="btn btn-warning w-100"
                                                onClick={() => startQuiz(quiz.id)}
                                            >
                                                <i className="fas fa-play me-2"></i>
                                                Continue Quiz
                                            </button>
                                        )}
                                        {canViewResults(quiz) && (
                                            <div className="btn-group w-100" role="group">
                                                <button 
                                                    className="btn btn-info"
                                                    onClick={() => viewPollResults(quiz.id)}
                                                >
                                                    <i className="fas fa-chart-pie me-1"></i>
                                                    Poll Results
                                                </button>
                                                <a 
                                                    href="/student/history"
                                                    className="btn btn-outline-info"
                                                >
                                                    <i className="fas fa-history me-1"></i>
                                                    Details
                                                </a>
                                            </div>
                                        )}
                                        {status === 'Expired' && (
                                            <button className="btn btn-danger w-100" disabled>
                                                <i className="fas fa-times me-2"></i>
                                                Quiz Expired
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Quick Stats */}
            {quizzes.length > 0 && (
                <div className="card mt-4">
                    <div className="card-header">
                        <h5 className="mb-0">Quiz Summary</h5>
                    </div>
                    <div className="card-body">
                        <div className="row text-center">
                            <div className="col-md-3">
                                <div className="h4 text-success">
                                    {quizzes.filter(q => getQuizStatus(q) === 'Available').length}
                                </div>
                                <small className="text-muted">Available</small>
                            </div>
                            <div className="col-md-3">
                                <div className="h4 text-warning">
                                    {quizzes.filter(q => getQuizStatus(q) === 'In Progress').length}
                                </div>
                                <small className="text-muted">In Progress</small>
                            </div>
                            <div className="col-md-3">
                                <div className="h4 text-info">
                                    {quizzes.filter(q => getQuizStatus(q) === 'Completed').length}
                                </div>
                                <small className="text-muted">Completed</small>
                            </div>
                            <div className="col-md-3">
                                <div className="h4 text-danger">
                                    {quizzes.filter(q => getQuizStatus(q) === 'Expired').length}
                                </div>
                                <small className="text-muted">Expired</small>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AvailableQuizzes; 