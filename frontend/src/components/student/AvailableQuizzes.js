import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

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
    }, []);

    useEffect(() => {
        fetchAvailableQuizzes();
    }, [selectedClassId]);

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
        return status === 'Available';
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
                <button className="btn btn-primary" onClick={fetchAvailableQuizzes}>
                    <i className="fas fa-sync-alt me-2"></i>
                    Refresh
                </button>
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
                                        <span className={`badge ${getStatusBadgeClass(status)}`}>
                                            {status}
                                        </span>
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