import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const QuizResultsPage = () => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSubmissionResults();
    }, [submissionId]);

    const fetchSubmissionResults = async () => {
        try {
            console.log('Fetching results for submission:', submissionId);
            const response = await api.get(`/submissions/${submissionId}`);
            console.log('Submission results:', response.data);
            setSubmission(response.data.submission);
            setError('');
        } catch (err) {
            console.error('Error fetching submission results:', err);
            setError(err.response?.data?.message || 'Failed to fetch quiz results');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    const getScoreColor = (percentage) => {
        if (percentage >= 80) return 'text-success';
        if (percentage >= 60) return 'text-warning';
        return 'text-danger';
    };

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    <h4>Error</h4>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={() => navigate('/student/history')}>
                        Back to Quiz History
                    </button>
                </div>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    <h4>No Results Found</h4>
                    <p>Could not find results for this quiz submission.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/student/history')}>
                        Back to Quiz History
                    </button>
                </div>
            </div>
        );
    }

    const percentage = Math.round((submission.total_score / submission.max_score) * 100);

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow">
                        <div className="card-header bg-success text-white text-center">
                            <h2 className="mb-0">🎉 Quiz Completed!</h2>
                        </div>
                        <div className="card-body">
                            {/* Quiz Info */}
                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <h5 className="text-primary">{submission.quiz_title}</h5>
                                    <p className="text-muted mb-0">Class: {submission.class_name}</p>
                                    <p className="text-muted">Professor: {submission.first_name} {submission.last_name}</p>
                                </div>
                                <div className="col-md-6 text-md-end">
                                    <p className="mb-1"><strong>Submitted:</strong> {formatDate(submission.submitted_at)}</p>
                                    <p className="mb-0"><strong>Time Taken:</strong> {submission.time_taken_minutes || 0} minutes</p>
                                </div>
                            </div>

                            {/* Score Section */}
                            <div className="text-center mb-4">
                                <div className="row">
                                    <div className="col-md-4">
                                        <div className="card bg-light">
                                            <div className="card-body">
                                                <h3 className={`mb-0 ${getScoreColor(percentage)}`}>
                                                    {submission.total_score} / {submission.max_score}
                                                </h3>
                                                <p className="text-muted mb-0">Points Earned</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="card bg-light">
                                            <div className="card-body">
                                                <h3 className={`mb-0 ${getScoreColor(percentage)}`}>
                                                    {percentage}%
                                                </h3>
                                                <p className="text-muted mb-0">Percentage</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="card bg-light">
                                            <div className="card-body">
                                                <h3 className="mb-0 text-info">
                                                    {submission.total_questions || 'N/A'}
                                                </h3>
                                                <p className="text-muted mb-0">Total Questions</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Message */}
                            <div className="text-center mb-4">
                                {percentage >= 80 && (
                                    <div className="alert alert-success">
                                        <h5>🌟 Excellent Work!</h5>
                                        <p className="mb-0">You've demonstrated a strong understanding of the material.</p>
                                    </div>
                                )}
                                {percentage >= 60 && percentage < 80 && (
                                    <div className="alert alert-warning">
                                        <h5>👍 Good Job!</h5>
                                        <p className="mb-0">You've shown a good grasp of the concepts. Keep it up!</p>
                                    </div>
                                )}
                                {percentage < 60 && (
                                    <div className="alert alert-info">
                                        <h5>📚 Keep Learning!</h5>
                                        <p className="mb-0">Consider reviewing the material and don't hesitate to ask questions.</p>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="text-center">
                                <button 
                                    className="btn btn-primary me-3"
                                    onClick={() => navigate('/student/history')}
                                >
                                    View All Quiz History
                                </button>
                                <button 
                                    className="btn btn-outline-secondary me-3"
                                    onClick={() => navigate('/student/dashboard')}
                                >
                                    Back to Dashboard
                                </button>
                                {submission.show_results_after_submission && (
                                    <button 
                                        className="btn btn-info"
                                        onClick={() => navigate(`/student/poll-results/${submission.quiz_id}`)}
                                    >
                                        View Poll Results
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizResultsPage;
