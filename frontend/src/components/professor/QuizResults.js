import React, { useState, useEffect, useCallback } from 'react';
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
    
    // Live answer tracking (socket-only, no database)
    const [liveAnswers, setLiveAnswers] = useState({}); // { studentId: { questionId: { optionId, optionText, timestamp } } }
    const [liveStudents, setLiveStudents] = useState({}); // { studentId: { name, lastActivity } }
    const [livePollStats, setLivePollStats] = useState([]); // Live poll statistics calculated from socket data

    useEffect(() => {
        console.log('🔄 Setting up socket connection for QuizResults...');
        
        // Force connect if not connected
        if (!socket.connected) {
            console.log('🔌 Socket not connected, forcing connection...');
            socket.connect();
        } else {
            console.log('✅ Socket already connected:', socket.id);
            // If already connected, join rooms immediately
            socket.emit('join_professor_room', user.id);
            socket.emit('join_quiz_room', quizId);
        }

        socket.on('connect', () => {
            console.log('✅ Socket.IO connected in QuizResults:', socket.id);
            // Join professor room for receiving live updates
            socket.emit('join_professor_room', user.id);
            // Join quiz room for receiving live answer updates for this specific quiz
            socket.emit('join_quiz_room', quizId);
            console.log(`📡 Joined rooms: professor_${user.id}, quiz_${quizId}`);
        });
        
        socket.on('disconnect', () => {
            console.log('Socket.IO disconnected in QuizResults');
        });
        
        socket.on('connect_error', (error) => {
            console.error('Socket connection error in QuizResults:', error);
        });
        
        // 🔥 LIVE ANSWER UPDATES - Socket Only (No Database!)
        socket.on('live_answer_update', (data) => {
            console.log('📝 LIVE: Answer update received in QuizResults:', data);
            console.log('📝 Current quizId:', quizId, 'Received quizId:', data.quizId);
            
            // Only process if it's for this quiz
            if (String(data.quizId) === String(quizId)) {
                console.log('✅ Processing live answer update for matching quiz');
                
                // Update live answers state
                setLiveAnswers(prev => {
                    const updated = {
                        ...prev,
                        [data.studentId]: {
                            ...prev[data.studentId],
                            [data.questionId]: {
                                selectedOptionId: data.selectedOptionId,
                                optionText: data.optionText,
                                timestamp: data.timestamp,
                                isTimeExpired: data.isTimeExpired || false
                            }
                        }
                    };
                    
                    console.log('📊 Updated live answers:', updated);
                    return updated;
                });

                // Update student activity
                setLiveStudents(prev => {
                    const updated = {
                        ...prev,
                        [data.studentId]: {
                            name: data.studentName,
                            lastActivity: data.timestamp
                        }
                    };
                    console.log('👥 Updated live students:', updated);
                    return updated;
                });

                console.log(`🎯 LIVE: Student ${data.studentName} selected "${data.optionText}" for question ${data.questionId}`);
            } else {
                console.log('❌ Ignoring answer update for different quiz');
            }
        });
        
        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
            socket.off('live_answer_update');
        };
    }, [user.id, quizId]);

    // 🔥 Calculate live poll statistics from socket data only!
    const calculateLivePollStats = useCallback((answersData) => {
        if (!quiz || !quiz.questions || !answersData || Object.keys(answersData).length === 0) {
            console.log('📊 Cannot calculate live poll stats:', {
                hasQuiz: !!quiz,
                hasQuestions: !!(quiz && quiz.questions),
                hasAnswers: !!(answersData && Object.keys(answersData).length > 0)
            });
            setLivePollStats([]);
            return;
        }
        
        console.log('📊 Calculating live poll stats from socket data:', answersData);
        
        const stats = quiz.questions.map(question => {
            // Count selections for each option from live socket data
            const optionCounts = {};
            let totalSelections = 0;
            
            // Initialize all options with 0 count
            question.options.forEach(option => {
                optionCounts[option.id] = {
                    optionId: option.id,
                    optionText: option.option_text,
                    isCorrect: option.is_correct,
                    selectionCount: 0,
                    percentage: 0
                };
            });
            
            // Count selections from live socket data
            Object.values(answersData).forEach(studentAnswers => {
                const answer = studentAnswers[question.id];
                if (answer && optionCounts[answer.selectedOptionId]) {
                    optionCounts[answer.selectedOptionId].selectionCount++;
                    totalSelections++;
                }
            });
            
            // Calculate percentages
            Object.values(optionCounts).forEach(option => {
                option.percentage = totalSelections > 0 
                    ? Math.round((option.selectionCount / totalSelections) * 100)
                    : 0;
            });
            
            return {
                questionId: question.id,
                questionText: question.question_text,
                questionOrder: question.question_order,
                totalSelections,
                options: Object.values(optionCounts)
            };
        });
        
        console.log('📊 Live poll stats calculated:', stats);
        setLivePollStats(stats);
    }, [quiz]);

    // Separate effect to calculate live poll stats when quiz or live answers change
    useEffect(() => {
        console.log('🔄 Live poll stats effect triggered:', {
            hasQuiz: !!quiz,
            hasQuestions: !!(quiz && quiz.questions),
            liveAnswersCount: Object.keys(liveAnswers).length,
            liveStudentsCount: Object.keys(liveStudents).length
        });
        
        if (quiz && quiz.questions && Object.keys(liveAnswers).length > 0) {
            console.log('📊 Recalculating live poll stats due to quiz or answers change');
            console.log('📊 Current live answers:', liveAnswers);
            calculateLivePollStats(liveAnswers);
        } else if (quiz && quiz.questions) {
            console.log('📊 Quiz loaded but no live answers yet, clearing stats');
            setLivePollStats([]);
        }
    }, [quiz, liveAnswers, calculateLivePollStats]);

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
            console.log('🔄 Fetching quiz results for quizId:', quizId);
            
            // Fetch quiz info AND completed submissions from database
            const [quizResponse, resultsResponse] = await Promise.all([
                api.get(`/quizzes/${quizId}`),
                api.get(`/quizzes/${quizId}/results?sortBy=${sortBy}&sortOrder=${sortOrder}`)
            ]);
            
            console.log('📊 Quiz data received:', quizResponse.data.quiz);
            console.log('📊 Results data received:', resultsResponse.data);
            
            setQuiz(quizResponse.data.quiz);
            
            // Set completed submissions from database (students who finished the quiz)
            const results = resultsResponse.data.results || [];
            const answerStats = resultsResponse.data.answerStats || [];
            
            console.log('📊 Setting results:', results);
            console.log('📊 Setting answer stats:', answerStats);
            
            setResults(results);
            setAnswerStats(answerStats);
            
            console.log('📊 Quiz loaded with', results.length, 'completed submissions');
            console.log('🔴 Live socket data will show students currently taking the quiz');
            
            setError('');
        } catch (err) {
            console.error('❌ Error fetching quiz results:', err);
            setError(err.response?.data?.message || 'Failed to fetch quiz results');
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = async () => {
        try {
            const csvData = [];
            
            // Add completed submissions from database
            results.forEach(result => {
                csvData.push({
                    'Student Name': result.student_name,
                    'Student ID': result.student_id,
                    'Score': `${result.score}/${result.total_questions}`,
                    'Percentage': `${result.percentage}%`,
                    'Time Taken': result.time_taken,
                    'Submitted At': formatDate(result.submitted_at),
                    'Status': 'Completed',
                    'Data Source': 'Database'
                });
            });
            
            // Add live data from socket (students currently taking quiz)
            Object.entries(liveStudents).forEach(([studentId, student]) => {
                const studentAnswers = liveAnswers[studentId] || {};
                const answeredQuestions = Object.keys(studentAnswers).length;
                const lastActivity = new Date(student.lastActivity).toLocaleString();
                
                csvData.push({
                    'Student Name': student.name,
                    'Student ID': studentId,
                    'Score': `${answeredQuestions}/? (In Progress)`,
                    'Percentage': 'N/A (Taking Quiz)',
                    'Time Taken': 'In Progress',
                    'Submitted At': 'Not Yet Submitted',
                    'Last Activity': lastActivity,
                    'Status': 'Taking Quiz (Live)',
                    'Data Source': 'Socket (Real-time)'
                });
            });

            if (csvData.length === 0) {
                alert('No data to export - no completed submissions or live quiz takers found');
                return;
            }

            const headers = Object.keys(csvData[0]);
            const csvContent = [
                headers.join(','),
                ...csvData.map(row => headers.map(field => `"${row[field] || ''}"`).join(','))
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

            alert(`Exported ${csvData.length} records (${results.length} completed, ${Object.keys(liveStudents).length} live)`);
        } catch (err) {
            alert('Failed to export data');
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
        const liveStudentCount = Object.keys(liveStudents).length;
        const completedSubmissions = results.length;
        const totalStudents = liveStudentCount + completedSubmissions;
        
        console.log('📊 Calculating stats:', { liveStudentCount, completedSubmissions, totalStudents });
        
        // Calculate stats from live data (socket-only, no database!)
        const totalLiveAnswers = Object.values(liveAnswers).reduce((sum, studentAnswers) => 
            sum + Object.keys(studentAnswers).length, 0
        );
        
        // Fix NaN issue - ensure we have valid results with percentage values
        const validResults = results.filter(result => result.percentage != null && !isNaN(result.percentage));
        const avgScoreCompleted = validResults.length > 0 
            ? Math.round((validResults.reduce((sum, result) => sum + parseFloat(result.percentage || 0), 0) / validResults.length) * 10) / 10
            : 0;
        
        console.log('📊 Stats calculated:', { 
            avgScoreCompleted, 
            validResults: validResults.length,
            totalLiveAnswers 
        });
        
        return {
            totalStudents,
            liveStudents: liveStudentCount,
            completedSubmissions,
            totalLiveAnswers,
            avgScoreCompleted,
            activeNow: liveStudentCount
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
                    <button 
                        className="btn btn-success me-2" 
                        onClick={exportToCSV} 
                        disabled={results.length === 0 && Object.keys(liveStudents).length === 0}
                    >
                        <i className="fas fa-download me-2"></i>
                        Export All Data
                    </button>
                    <button className="btn btn-primary me-2" onClick={fetchQuizResults}>
                        <i className="fas fa-sync-alt me-2"></i>
                        Refresh Results
                    </button>
                    <button 
                        className="btn btn-warning me-2" 
                        onClick={() => {
                            console.log('🧪 DEBUG INFO:');
                            console.log('Socket connected:', socket.connected);
                            console.log('Socket ID:', socket.id);
                            console.log('Live students:', liveStudents);
                            console.log('Live answers:', liveAnswers);
                            console.log('Live poll stats:', livePollStats);
                            console.log('Quiz data:', quiz);
                            
                            // Test socket emission
                            console.log('📡 Testing socket connection...');
                            socket.emit('join_quiz_room', quizId);
                            socket.emit('join_professor_room', user.id);
                        }}
                    >
                        <i className="fas fa-bug me-2"></i>
                        Debug Socket
                    </button>
                    <button 
                        className="btn btn-info" 
                        onClick={() => {
                            console.log('🧪 SIMULATING STUDENT ANSWER...');
                            if (quiz && quiz.questions && quiz.questions.length > 0) {
                                const testAnswer = {
                                    studentId: 'test_student_123',
                                    studentName: 'Test Student',
                                    quizId: parseInt(quizId),
                                    questionId: quiz.questions[0].id,
                                    selectedOptionId: quiz.questions[0].options[0].id,
                                    optionText: quiz.questions[0].options[0].option_text,
                                    timestamp: Date.now()
                                };
                                
                                console.log('📡 Emitting test answer:', testAnswer);
                                socket.emit('live_answer_update', testAnswer);
                            } else {
                                console.log('❌ No quiz data available for test');
                            }
                        }}
                    >
                        <i className="fas fa-flask me-2"></i>
                        Test Answer
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

            {/* Live Overall Statistics - Socket + Database Combined! */}
            {(stats || results.length > 0 || Object.keys(liveStudents).length > 0) && (
                <div className="row mb-4">
                    <div className="col-md-3 mb-3">
                        <div className="card text-center border-primary">
                            <div className="card-body">
                                <h5 className="card-title text-primary">
                                    <i className="fas fa-users me-2"></i>
                                    {stats ? stats.totalStudents : results.length + Object.keys(liveStudents).length}
                                </h5>
                                <p className="card-text small">Total Students</p>
                                <small className="text-primary">Live + Completed</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3 mb-3">
                        <div className="card text-center border-success">
                            <div className="card-body">
                                <h5 className="card-title text-success">
                                    <i className="fas fa-check-circle me-2"></i>
                                    {stats ? stats.completedSubmissions : results.length}
                                </h5>
                                <p className="card-text small">Completed</p>
                                <small className="text-success">Database</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3 mb-3">
                        <div className="card text-center border-warning">
                            <div className="card-body">
                                <h5 className="card-title text-warning">
                                    <i className="fas fa-bolt me-2"></i>
                                    {stats ? stats.activeNow : Object.keys(liveStudents).length}
                                </h5>
                                <p className="card-text small">Taking Quiz Now</p>
                                <small className="text-warning">Live Socket</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3 mb-3">
                        <div className="card text-center border-info">
                            <div className="card-body">
                                <h5 className="card-title text-info">
                                    <i className="fas fa-percentage me-2"></i>
                                    {stats && !isNaN(stats.avgScoreCompleted) && stats.avgScoreCompleted > 0 ? 
                                        `${stats.avgScoreCompleted}%` : 
                                        results.length > 0 ? 
                                            `${Math.round((results.reduce((sum, r) => sum + (parseFloat(r.percentage) || 0), 0) / results.length) * 10) / 10}%` : 
                                            '0%'
                                    }
                                </h5>
                                <p className="card-text small">Avg Score</p>
                                <small className="text-info">Completed Only</small>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔥 LIVE ANSWER TRACKING - Socket Only! */}
            {Object.keys(liveStudents).length > 0 && (
                <div className="card mb-4 border-success">
                    <div className="card-header bg-success text-white">
                        <h5 className="mb-0">
                            <i className="fas fa-bolt me-2"></i>
                            Live Answers (Socket Only - No Database)
                        </h5>
                        <small>Real-time answers from students currently taking the quiz</small>
                    </div>
                    <div className="card-body">
                        {Object.entries(liveStudents).map(([studentId, student]) => {
                            const studentAnswers = liveAnswers[studentId] || {};
                            const answerCount = Object.keys(studentAnswers).length;
                            const lastActivity = new Date(student.lastActivity).toLocaleTimeString();
                            
                            return (
                                <div key={studentId} className="border rounded p-3 mb-3 bg-light">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="mb-0">
                                            <i className="fas fa-user-circle text-success me-2"></i>
                                            {student.name}
                                        </h6>
                                        <div className="text-muted small">
                                            <i className="fas fa-clock me-1"></i>
                                            Last activity: {lastActivity}
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-md-3">
                                            <div className="text-center">
                                                <div className="fw-bold text-primary">{answerCount}</div>
                                                <small className="text-muted">Questions Answered</small>
                                            </div>
                                        </div>
                                        <div className="col-md-9">
                                            <div className="d-flex flex-wrap gap-2">
                                                {Object.entries(studentAnswers).map(([questionId, answerData]) => (
                                                    <div 
                                                        key={questionId} 
                                                        className={`badge ${answerData.isTimeExpired ? 'bg-warning' : 'bg-success'} text-wrap`}
                                                        style={{maxWidth: '200px'}}
                                                        title={answerData.isTimeExpired ? 'Time Expired' : 'Active Selection'}
                                                    >
                                                        Q{questionId}: {answerData.optionText}
                                                        {answerData.isTimeExpired && ' ⏰'}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="alert alert-info mb-0">
                            <i className="fas fa-info-circle me-2"></i>
                            <strong>Live Updates:</strong> These answers are streamed in real-time via Socket.IO. 
                            They are <strong>NOT stored in the database</strong> until the student completes the entire quiz.
                        </div>
                    </div>
                </div>
            )}

            {/* 🔥 LIVE POLL RESULTS - Socket Only (No Database!) */}
            {livePollStats.length > 0 && (
                <div className="card mb-4">
                    <div className="card-header bg-warning text-dark">
                        <h5 className="mb-0">
                            <i className="fas fa-poll me-2"></i>
                            Live Poll Results (Real-Time Socket Data)
                        </h5>
                        <small>Updated instantly as students select answers - No database calls!</small>
                    </div>
                    <div className="card-body">
                        {livePollStats.map(question => (
                            <div key={question.questionId} className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="fw-bold mb-0">
                                        Question {question.questionOrder}: {question.questionText}
                                    </h6>
                                    <div className="badge bg-info">
                                        <i className="fas fa-users me-1"></i>
                                        {question.totalSelections} live responses
                                    </div>
                                </div>
                                <div className="row">
                                    {question.options.map(option => (
                                        <div key={`live-${question.questionId}-${option.optionId}`} className="col-md-6 mb-3">
                                            <div className={`card ${option.isCorrect ? 'border-success shadow-sm' : 'border-light'} h-100`}>
                                                <div className="card-body py-3">
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <div className="flex-grow-1">
                                                            <div className="fw-bold">
                                                                {option.isCorrect && <i className="fas fa-check-circle text-success me-2"></i>}
                                                                {option.optionText}
                                                            </div>
                                                        </div>
                                                        <div className="text-end">
                                                            <div className="fs-5 fw-bold text-primary">{option.selectionCount}</div>
                                                            <small className="text-muted">votes</small>
                                                        </div>
                                                    </div>
                                                    <div className="progress mb-2" style={{ height: '8px' }}>
                                                        <div 
                                                            className={`progress-bar ${option.isCorrect ? 'bg-success' : 'bg-primary'} progress-bar-striped progress-bar-animated`}
                                                            style={{ 
                                                                width: `${option.percentage}%`,
                                                                transition: 'width 0.6s ease-in-out'
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <small className="text-muted">
                                                            {option.isCorrect ? (
                                                                <span className="text-success fw-bold">
                                                                    <i className="fas fa-star me-1"></i>
                                                                    Correct Answer
                                                                </span>
                                                            ) : (
                                                                'Option'
                                                            )}
                                                        </small>
                                                        <span className={`badge ${option.percentage > 0 ? 'bg-primary' : 'bg-light text-dark'}`}>
                                                            {option.percentage}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div className="alert alert-success d-flex align-items-center">
                            <i className="fas fa-bolt me-3 fs-4"></i>
                            <div>
                                <strong>Live Polling System:</strong> This data updates in real-time via Socket.IO as students make their selections. 
                                <strong>No database queries</strong> are made for these live updates!
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Message when no live data yet but we have database results */}
            {livePollStats.length === 0 && Object.keys(liveStudents).length === 0 && (
                <div className="card mb-4">
                    <div className="card-body text-center py-5">
                        <i className="fas fa-hourglass-half fs-1 text-muted mb-3"></i>
                        <h5 className="text-muted">No Live Quiz Activity</h5>
                        <div className="text-start">
                            <p className="text-muted mb-1">
                                📊 <strong>Completed submissions:</strong> {results.length} students found in database<br />
                                🔴 <strong>Live students:</strong> {Object.keys(liveStudents).length} currently taking the quiz<br />
                                📡 <strong>Socket status:</strong> {socket.connected ? '✅ Connected' : '❌ Disconnected'} (ID: {socket.id})
                            </p>
                            <hr />
                            <p className="text-muted mb-0">
                                <strong>🔥 Live poll results</strong> will appear here automatically as students start taking the quiz.<br />
                                <small>• Students must select answers to see live polling data<br />
                                • Results update in real-time via Socket.IO (no database calls)<br />
                                • Use "Debug Socket" button above to check connection status</small>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔥 COMPLETED SUBMISSIONS from Database */}
            {results.length > 0 && (
                <div className="card">
                    <div className="card-header bg-primary text-white">
                        <h5 className="mb-0">
                            <i className="fas fa-check-circle me-2"></i>
                            Completed Submissions ({results.length})
                        </h5>
                        <small>Students who have finished and submitted the quiz</small>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Student</th>
                                        <th>Score</th>
                                        <th>Percentage</th>
                                        <th>Time Taken</th>
                                        <th>Submitted At</th>
                                        <th>Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((result, index) => (
                                        <tr key={result.id}>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <i className="fas fa-user-circle text-muted me-2"></i>
                                                    <div>
                                                        <div className="fw-bold">{result.student_name}</div>
                                                        <small className="text-muted">ID: {result.student_id}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="fw-bold text-primary">
                                                    {result.score}/{result.total_questions}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="progress me-2" style={{ width: '60px', height: '8px' }}>
                                                        <div 
                                                            className={`progress-bar ${getGradeBadgeClass(result.percentage)}`}
                                                            style={{ width: `${result.percentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="fw-bold">{result.percentage}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <i className="fas fa-clock text-muted me-1"></i>
                                                {result.time_taken}
                                            </td>
                                            <td>{formatDate(result.submitted_at)}</td>
                                            <td>
                                                <span className={`badge ${getGradeBadgeClass(result.percentage)}`}>
                                                    {result.percentage >= 90 ? 'A' : 
                                                     result.percentage >= 80 ? 'B' : 
                                                     result.percentage >= 70 ? 'C' : 
                                                     result.percentage >= 60 ? 'D' : 'F'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Database Answer Statistics */}
            {answerStats.length > 0 && (
                <div className="card mt-4">
                    <div className="card-header bg-info text-white">
                        <h5 className="mb-0">
                            <i className="fas fa-chart-bar me-2"></i>
                            Completed Quiz Statistics (Database Results)
                        </h5>
                        <small>Answer breakdown from submitted quizzes</small>
                    </div>
                    <div className="card-body">
                        {answerStats.map(question => (
                            <div key={question.questionId} className="mb-4">
                                <h6 className="fw-bold">Question {question.questionOrder}: {question.questionText}</h6>
                                <div className="row">
                                    {question.options.map(option => (
                                        <div key={option.optionId} className="col-md-6 mb-2">
                                            <div className={`card ${option.isCorrect ? 'border-success' : 'border-light'} h-100`}>
                                                <div className="card-body py-2">
                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                        <div>
                                                            {option.isCorrect && <i className="fas fa-check-circle text-success me-2"></i>}
                                                            {option.optionText}
                                                        </div>
                                                        <span className="badge bg-secondary">{option.selectionCount} votes</span>
                                                    </div>
                                                    <div className="progress" style={{ height: '6px' }}>
                                                        <div 
                                                            className={`progress-bar ${option.isCorrect ? 'bg-success' : 'bg-secondary'}`}
                                                            style={{ width: `${option.percentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <small className="text-muted">{option.percentage}%</small>
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