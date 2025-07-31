import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import socket from '../../services/socket';

const QuizResults = () => {
    const { quizId } = useParams();
    const { user } = useAuth();
    const [quiz, setQuiz] = useState(null);
    const [results, setResults] = useState([]);
    const [answerStats, setAnswerStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortBy, setSortBy] = useState('submitted_at');
    const [sortOrder, setSortOrder] = useState('DESC');

    useEffect(() => {
        socket.on('connect', () => {
            console.log('Socket.IO connected in QuizResults:', socket.id);
        });
        socket.on('disconnect', () => {
            console.log('Socket.IO disconnected in QuizResults');
        });
        socket.on('connect_error', (error) => {
            console.error('Socket connection error in QuizResults:', error);
        });
        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
        };
    }, []);
    useEffect(() => {
        console.log('Setting up quiz results listener for quiz:', quizId);
        // Note: Not joining rooms since socket connection has issues
        // socket.emit('joinQuizResults', quizId);
    }, [quizId]);

    useEffect(() => {
        socket.on('quizResultsUpdated', (data) => {
            console.log('Received quizResultsUpdated:', data);
            if (String(data.quizId) === String(quizId)) {
                console.log('Refreshing quiz results for quiz:', quizId);
                fetchQuizResults(); // This should refresh the results
            }
        });
        return () => {
            socket.off('quizResultsUpdated');
        };
    }, [quizId, sortBy, sortOrder]);
    useEffect(() => {
        if (quizId) {
            fetchQuizResults();
        }

        socket.on('quizResultsUpdated', (data) => {
            console.log('Received quizResultsUpdated:', data);
            if (String(data.quizId) === String(quizId)) {
                fetchQuizResults();
            }
        });

        return () => {
            socket.off('quizResultsUpdated');
        };
    }, [quizId, sortBy, sortOrder]);

    const fetchQuizResults = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/quizzes/${quizId}/results`);
            setQuiz(response.data.quiz);

            // Sort results
            const sortedResults = response.data.results.sort((a, b) => {
                const aVal = a[sortBy];
                const bVal = b[sortBy];
                if (sortOrder === 'ASC') {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });
            setResults(sortedResults);

            // Process answer statistics
            const statsMap = new Map();
            response.data.answerStatistics.forEach(stat => {
                if (!statsMap.has(stat.question_id)) {
                    statsMap.set(stat.question_id, {
                        questionId: stat.question_id,
                        questionText: stat.question_text,
                        questionOrder: stat.question_order,
                        options: []
                    });
                }
                statsMap.get(stat.question_id).options.push({
                    optionId: stat.option_id,
                    optionText: stat.option_text,
                    isCorrect: stat.is_correct,
                    selectionCount: stat.selection_count,
                    percentage: stat.percentage
                });
            });
            setAnswerStats(Array.from(statsMap.values()).sort((a, b) => a.questionOrder - b.questionOrder));
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch quiz results');
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = async () => {
        try {
            const csvData = results.map(result => ({
                'Student Name': `${result.first_name} ${result.last_name}`,
                'Username': result.username,
                'Score': result.total_score,
                'Max Score': result.max_score,
                'Percentage': result.percentage,
                'Time Taken (minutes)': result.time_taken_minutes,
                'Started At': new Date(result.started_at).toLocaleString(),
                'Submitted At': new Date(result.submitted_at).toLocaleString()
            }));

            if (csvData.length === 0) {
                alert('No data to export');
                return;
            }

            const headers = Object.keys(csvData[0]);
            const csvContent = [
                headers.join(','),
                ...csvData.map(row => headers.map(field => `"${row[field]}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `quiz_${quizId}_results_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            alert('Results exported successfully!');
        } catch (err) {
            alert('Failed to export results');
        }
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleString();

    const getGradeBadgeClass = (percentage) => {
        if (percentage >= 90) return 'bg-success';
        if (percentage >= 80) return 'bg-info';
        if (percentage >= 70) return 'bg-warning';
        if (percentage >= 60) return 'bg-orange';
        return 'bg-danger';
    };

    const calculateOverallStats = () => {
        if (results.length === 0) return null;
        const totalStudents = results.length;
        const averageScore = results.reduce((sum, result) => sum + result.percentage, 0) / totalStudents;
        const highestScore = Math.max(...results.map(r => r.percentage));
        const lowestScore = Math.min(...results.map(r => r.percentage));
        const passRate = results.filter(r => r.percentage >= 60).length / totalStudents * 100;
        return {
            totalStudents,
            averageScore: Math.round(averageScore),
            highestScore,
            lowestScore,
            passRate: Math.round(passRate)
        };
    };

    const stats = calculateOverallStats();

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

    if (!quiz) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Quiz not found or you don't have permission to view its results.
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2>{quiz.title} - Results</h2>
                    <p className="text-muted mb-0">Total Submissions: {quiz.totalSubmissions}</p>
                </div>
                <div>
                    <button className="btn btn-success me-2" onClick={exportToCSV} disabled={results.length === 0}>
                        <i className="fas fa-download me-2"></i>
                        Export CSV
                    </button>
                    <button className="btn btn-primary" onClick={fetchQuizResults}>
                        <i className="fas fa-sync-alt me-2"></i>
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
            )}

            {/* Overall Statistics */}
            {stats && (
                <div className="row mb-4">
                    <div className="col-md-2 mb-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <h5 className="card-title text-primary">{stats.totalStudents}</h5>
                                <p className="card-text small">Total Students</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-2 mb-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <h5 className="card-title text-info">{stats.averageScore}%</h5>
                                <p className="card-text small">Average Score</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-2 mb-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <h5 className="card-title text-success">{stats.highestScore}%</h5>
                                <p className="card-text small">Highest Score</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-2 mb-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <h5 className="card-title text-danger">{stats.lowestScore}%</h5>
                                <p className="card-text small">Lowest Score</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-2 mb-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <h5 className="card-title text-warning">{stats.passRate}%</h5>
                                <p className="card-text small">Pass Rate (≥60%)</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Table */}
            <div className="card mb-4">
                <div className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Student Results</h5>
                        <div className="d-flex align-items-center">
                            <label className="me-2">Sort by:</label>
                            <select 
                                className="form-select form-select-sm me-2" 
                                style={{ width: 'auto' }}
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="submitted_at">Submission Date</option>
                                <option value="percentage">Score %</option>
                                <option value="total_score">Score Points</option>
                                <option value="time_taken_minutes">Time Taken</option>
                                <option value="last_name">Student Name</option>
                            </select>
                            <select 
                                className="form-select form-select-sm" 
                                style={{ width: 'auto' }}
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                            >
                                <option value="DESC">Descending</option>
                                <option value="ASC">Ascending</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="card-body">
                    {results.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-muted">No submissions yet for this quiz.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Score</th>
                                        <th>Grade</th>
                                        <th>Time Taken</th>
                                        <th>Submitted At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map(result => (
                                        <tr key={result.id}>
                                            <td>
                                                <div className="fw-bold">{result.first_name} {result.last_name}</div>
                                                <small className="text-muted">{result.username}</small>
                                            </td>
                                            <td>
                                                <span className="fw-bold">
                                                    {result.total_score}/{result.max_score}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${getGradeBadgeClass(result.percentage)}`}>
                                                    {result.percentage}%
                                                </span>
                                            </td>
                                            <td>{result.time_taken_minutes} min</td>
                                            <td>{formatDate(result.submitted_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Answer Statistics */}
            {answerStats.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h5 className="mb-0">Question Analysis & Poll Results</h5>
                    </div>
                    <div className="card-body">
                        {answerStats.map(question => (
                            <div key={question.questionId} className="mb-4">
                                <h6 className="fw-bold">
                                    Question {question.questionOrder}: {question.questionText}
                                </h6>
                                <div className="row">
                                    {question.options.map(option => (
                                        <div key={option.optionId} className="col-md-6 mb-2">
                                            <div className={`card ${option.isCorrect ? 'border-success' : ''}`}>
                                                <div className="card-body py-2">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div className="flex-grow-1">
                                                            <small className="text-muted">
                                                                {option.isCorrect && <i className="fas fa-check text-success me-1"></i>}
                                                                {option.optionText}
                                                            </small>
                                                        </div>
                                                        <div className="text-end">
                                                            <div className="fw-bold">{option.selectionCount} votes</div>
                                                            <small className="text-muted">{option.percentage}%</small>
                                                        </div>
                                                    </div>
                                                    <div className="progress mt-1" style={{ height: '4px' }}>
                                                        <div 
                                                            className={`progress-bar ${option.isCorrect ? 'bg-success' : 'bg-primary'}`}
                                                            style={{ width: `${option.percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizResults;