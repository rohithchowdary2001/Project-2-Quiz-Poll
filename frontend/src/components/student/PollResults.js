import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const PollResults = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [pollResults, setPollResults] = useState([]);
    const [quizInfo, setQuizInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (quizId) {
            fetchPollResults();
        }
    }, [quizId]);

    const fetchPollResults = async () => {
        try {
            console.log(`PollResults - Fetching poll results for quiz ${quizId}`);
            setLoading(true);
            
            // Get poll results
            const response = await api.get(`/submissions/poll-results/${quizId}`);
            console.log('PollResults - Results fetched:', response.data);
            
            setPollResults(response.data.questions || []);
            setQuizInfo({
                id: response.data.quizId,
                title: 'Quiz Results' // We'll get this from another endpoint if needed
            });
            
            setError('');
        } catch (err) {
            console.error('PollResults - Error fetching results:', err);
            setError(err.response?.data?.message || 'Failed to fetch poll results');
            
            if (err.response?.status === 403) {
                setError('You must complete this quiz before viewing poll results.');
            }
        } finally {
            setLoading(false);
        }
    };

    const getOptionColor = (optionIndex) => {
        const colors = ['primary', 'success', 'warning', 'danger', 'info', 'secondary'];
        return colors[optionIndex % colors.length];
    };

    const getHighestVotedOption = (options) => {
        return options.reduce((max, option) => option.voteCount > max.voteCount ? option : max, options[0]);
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

    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/student/quizzes')}>
                    Back to Quizzes
                </button>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2>Poll Results</h2>
                    <p className="text-muted mb-0">See how your classmates responded to each question</p>
                </div>
                <div>
                    <button className="btn btn-outline-secondary me-2" onClick={() => navigate('/student/quizzes')}>
                        <i className="fas fa-arrow-left me-2"></i>
                        Back to Quizzes
                    </button>
                    <button className="btn btn-primary" onClick={fetchPollResults}>
                        <i className="fas fa-sync-alt me-2"></i>
                        Refresh
                    </button>
                </div>
            </div>

            {pollResults.length === 0 ? (
                <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    No poll results available for this quiz yet.
                </div>
            ) : (
                <div className="row">
                    {pollResults.map((question, questionIndex) => {
                        const totalVotes = question.options.reduce((sum, option) => sum + option.voteCount, 0);
                        const mostVoted = getHighestVotedOption(question.options);
                        
                        return (
                            <div key={question.id} className="col-12 mb-4">
                                <div className="card">
                                    <div className="card-header">
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div className="flex-grow-1">
                                                <h5 className="mb-0">
                                                    Question {question.order}: {question.text}
                                                </h5>
                                            </div>
                                            <div className="text-end">
                                                <span className="badge bg-primary">
                                                    {totalVotes} total votes
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-body">
                                        <div className="row">
                                            {question.options.map((option, optionIndex) => {
                                                const percentage = totalVotes > 0 ? (option.voteCount / totalVotes * 100) : 0;
                                                const isTopChoice = option.voteCount === mostVoted.voteCount && option.voteCount > 0;
                                                
                                                return (
                                                    <div key={option.id} className="col-md-6 mb-3">
                                                        <div className={`card h-100 ${isTopChoice ? 'border-success' : ''}`}>
                                                            <div className="card-body">
                                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                                    <div className="flex-grow-1">
                                                                        <div className="d-flex align-items-center mb-2">
                                                                            <span className={`badge bg-${getOptionColor(optionIndex)} me-2`}>
                                                                                {String.fromCharCode(65 + optionIndex)}
                                                                            </span>
                                                                            <span className="fw-bold">{option.text}</span>
                                                                            {isTopChoice && option.voteCount > 0 && (
                                                                                <i className="fas fa-crown text-warning ms-2" title="Most popular choice"></i>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        <div className="progress mb-2" style={{ height: '8px' }}>
                                                                            <div 
                                                                                className={`progress-bar bg-${getOptionColor(optionIndex)}`}
                                                                                style={{ width: `${percentage}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        
                                                                        <div className="d-flex justify-content-between">
                                                                            <small className="text-muted">
                                                                                {option.voteCount} votes
                                                                            </small>
                                                                            <small className="text-muted">
                                                                                {percentage.toFixed(1)}%
                                                                            </small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        
                                        {/* Question Summary */}
                                        <div className="mt-3 p-3 bg-light rounded">
                                            <div className="row text-center">
                                                <div className="col-md-4">
                                                    <div className="h6 text-primary">{totalVotes}</div>
                                                    <small className="text-muted">Total Responses</small>
                                                </div>
                                                <div className="col-md-4">
                                                    <div className="h6 text-success">
                                                        {mostVoted.voteCount > 0 ? `${Math.round(mostVoted.voteCount / totalVotes * 100)}%` : '0%'}
                                                    </div>
                                                    <small className="text-muted">Top Choice</small>
                                                </div>
                                                <div className="col-md-4">
                                                    <div className="h6 text-info">{question.options.length}</div>
                                                    <small className="text-muted">Options</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Overall Summary */}
            {pollResults.length > 0 && (
                <div className="card mt-4">
                    <div className="card-header">
                        <h5 className="mb-0">Poll Summary</h5>
                    </div>
                    <div className="card-body">
                        <div className="row text-center">
                            <div className="col-md-3">
                                <div className="h4 text-primary">{pollResults.length}</div>
                                <small className="text-muted">Total Questions</small>
                            </div>
                            <div className="col-md-3">
                                <div className="h4 text-success">
                                    {pollResults.reduce((sum, q) => sum + q.options.reduce((optSum, opt) => optSum + opt.voteCount, 0), 0)}
                                </div>
                                <small className="text-muted">Total Responses</small>
                            </div>
                            <div className="col-md-3">
                                <div className="h4 text-info">
                                    {Math.round(pollResults.reduce((sum, q) => sum + q.options.reduce((optSum, opt) => optSum + opt.voteCount, 0), 0) / pollResults.length)}
                                </div>
                                <small className="text-muted">Avg per Question</small>
                            </div>
                            <div className="col-md-3">
                                <div className="h4 text-warning">
                                    {Math.round(pollResults.reduce((sum, q) => sum + q.options.length, 0) / pollResults.length)}
                                </div>
                                <small className="text-muted">Avg Options</small>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PollResults; 