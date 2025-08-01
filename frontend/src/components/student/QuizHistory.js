import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const QuizHistory = () => {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        fetchQuizHistory();
    }, []);

    const fetchQuizHistory = async () => {
        try {
            console.log('QuizHistory - Fetching quiz history for student...');
            setLoading(true);
            const response = await api.get('/submissions/my-submissions');
            console.log('QuizHistory - Submissions fetched:', response.data);
            setSubmissions(response.data.submissions || []);
            setError('');
        } catch (err) {
            console.error('QuizHistory - Error fetching submissions:', err);
            setError(err.response?.data?.message || 'Failed to fetch quiz history');
        } finally {
            setLoading(false);
        }
    };

    const viewDetails = async (submissionId) => {
        try {
            console.log(`QuizHistory - Fetching details for submission ${submissionId}`);
            const response = await api.get(`/submissions/${submissionId}`);
            console.log('QuizHistory - Submission details:', response.data);
            setSelectedSubmission(response.data.submission);
            setShowDetailsModal(true);
        } catch (err) {
            console.error('QuizHistory - Error fetching submission details:', err);
            alert(err.response?.data?.message || 'Failed to fetch submission details');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    const formatDuration = (seconds) => {
        if (!seconds) return 'N/A';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const getScorePercentage = (score, maxScore) => {
        if (!maxScore || maxScore === 0) return 0;
        return Math.round((score / maxScore) * 100);
    };

    const getGradeBadgeClass = (percentage) => {
        if (percentage >= 90) return 'bg-success';
        if (percentage >= 80) return 'bg-info';
        if (percentage >= 70) return 'bg-warning';
        if (percentage >= 60) return 'bg-orange';
        return 'bg-danger';
    };

    const getStatusBadgeClass = (isCompleted) => {
        return isCompleted ? 'bg-success' : 'bg-warning';
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
                <h2>Quiz History</h2>
                <button className="btn btn-primary" onClick={fetchQuizHistory}>
                    <i className="fas fa-sync-alt me-2"></i>
                    Refresh
                </button>
            </div>

            {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
            )}

            {submissions.length === 0 ? (
                <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    No quiz submissions found. Start taking quizzes to see your history here!
                </div>
            ) : (
                <div className="card">
                    <div className="card-header">
                        <h5 className="mb-0">Your Quiz Submissions ({submissions.length})</h5>
                    </div>
                    <div className="card-body">
                        <div className="table-responsive">
                            <table className="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Quiz Title</th>
                                        <th>Class</th>
                                        <th>Status</th>
                                        <th>Score</th>
                                        <th>Grade</th>
                                        <th>Duration</th>
                                        <th>Submitted</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.map(submission => {
                                        const percentage = getScorePercentage(submission.total_score, submission.max_score);
                                        return (
                                            <tr key={submission.id}>
                                                <td>
                                                    <div className="fw-bold">{submission.quiz_title}</div>
                                                    <small className="text-muted">{submission.quiz_description}</small>
                                                </td>
                                                <td>
                                                    <span className="badge bg-light text-dark">
                                                        {submission.class_name}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${getStatusBadgeClass(submission.is_completed)}`}>
                                                        {submission.is_completed ? 'Completed' : 'In Progress'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="fw-bold">
                                                        {submission.total_score || 0}/{submission.max_score || 0}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${getGradeBadgeClass(percentage)}`}>
                                                        {percentage}%
                                                    </span>
                                                </td>
                                                <td>
                                                    {formatDuration(submission.duration_seconds)}
                                                </td>
                                                <td>
                                                    {formatDate(submission.submitted_at)}
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => viewDetails(submission.id)}
                                                    >
                                                        <i className="fas fa-eye"></i> View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedSubmission && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Quiz Submission Details</h5>
                                <button type="button" className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <h6>Quiz Information</h6>
                                        <p><strong>Title:</strong> {selectedSubmission.quiz_title}</p>
                                        <p><strong>Class:</strong> {selectedSubmission.class_name}</p>
                                        <p><strong>Description:</strong> {selectedSubmission.quiz_description}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <h6>Submission Details</h6>
                                        <p><strong>Status:</strong> 
                                            <span className={`badge ms-2 ${getStatusBadgeClass(selectedSubmission.is_completed)}`}>
                                                {selectedSubmission.is_completed ? 'Completed' : 'In Progress'}
                                            </span>
                                        </p>
                                        <p><strong>Score:</strong> {selectedSubmission.total_score || 0}/{selectedSubmission.max_score || 0}</p>
                                        <p><strong>Grade:</strong> 
                                            <span className={`badge ms-2 ${getGradeBadgeClass(getScorePercentage(selectedSubmission.total_score, selectedSubmission.max_score))}`}>
                                                {getScorePercentage(selectedSubmission.total_score, selectedSubmission.max_score)}%
                                            </span>
                                        </p>
                                        <p><strong>Duration:</strong> {formatDuration(selectedSubmission.duration_seconds)}</p>
                                        <p><strong>Started:</strong> {formatDate(selectedSubmission.started_at)}</p>
                                        <p><strong>Submitted:</strong> {formatDate(selectedSubmission.submitted_at)}</p>
                                    </div>
                                </div>

                                {selectedSubmission.answers && selectedSubmission.answers.length > 0 && (
                                    <div>
                                        <h6>Your Answers</h6>
                                        <div className="table-responsive">
                                            <table className="table table-sm">
                                                <thead>
                                                    <tr>
                                                        <th>Question</th>
                                                        <th>Your Answer</th>
                                                        <th>Correct Answer</th>
                                                        <th>Points</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedSubmission.answers.map((answer, index) => (
                                                        <tr key={index}>
                                                            <td>{answer.question_text}</td>
                                                            <td>{answer.selected_answer}</td>
                                                            <td>{answer.correct_answer}</td>
                                                            <td>
                                                                <span className={`badge ${answer.is_correct ? 'bg-success' : 'bg-danger'}`}>
                                                                    {answer.points_earned || 0}/{answer.points_possible || 0}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizHistory; 