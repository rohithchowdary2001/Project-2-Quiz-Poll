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
    const [expandedRows, setExpandedRows] = useState(new Set()); // Track expanded student rows
    
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
        
        // 🚨 DETAILED QUIZ QUESTIONS INSPECTION
        console.log('🔍 QUIZ QUESTIONS DETAILED INSPECTION:', (quiz.questions || []).map(q => ({
            id: q?.id,
            question_text: q?.question_text,
            text: q?.text,
            question_order: q?.question_order,
            order: q?.order,
            options: q?.options?.map(opt => ({
                id: opt?.id,
                option_text: opt?.option_text,
                text: opt?.text,
                is_correct: opt?.is_correct,
                correct: opt?.correct
            }))
        })));
        
        const stats = (quiz.questions || []).map(question => {
            // Count selections for each option from live socket data
            const optionCounts = {};
            let totalSelections = 0;
            
            // Initialize all options with 0 count - with multiple field name fallbacks
            question.options.forEach(option => {
                const optionText = option.option_text || option.text || `Option ${option.id}`;
                console.log('🔍 Option text resolution:', {
                    optionId: option.id,
                    option_text: option.option_text,
                    text: option.text,
                    final_text: optionText
                });
                
                optionCounts[option.id] = {
                    optionId: option.id,
                    optionText: optionText,
                    isCorrect: option.is_correct || option.correct || false,
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
            
            // Get question text with multiple field name fallbacks
            const questionText = question.question_text || question.text || `Question ${question.question_order || question.order || question.id}`;
            console.log('🔍 Question text resolution:', {
                questionId: question.id,
                question_text: question.question_text,
                text: question.text,
                question_order: question.question_order,
                order: question.order,
                final_text: questionText
            });

            return {
                questionId: question.id,
                questionText: questionText,
                questionOrder: question.question_order || question.order || 0,
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
            
            const quizData = quizResponse.data.quiz;
            const resultsData = resultsResponse.data.results || [];
            const answerStatsData = resultsResponse.data.answerStats || resultsResponse.data.answerStatistics || [];
            
            // 🚨 CRITICAL DEBUG: Log the exact structure we receive
            console.log('🔍 CRITICAL DATA STRUCTURE ANALYSIS:', {
                quizData: {
                    id: quizData?.id,
                    title: quizData?.title,
                    questions: quizData?.questions?.map(q => ({
                        id: q?.id,
                        question_text: q?.question_text,
                        question_order: q?.question_order,
                        options: q?.options?.map(opt => ({
                            id: opt?.id,
                            option_text: opt?.option_text,
                            is_correct: opt?.is_correct
                        }))
                    }))
                },
                resultsData: resultsData.map(r => ({
                    id: r?.id,
                    student_id: r?.student_id,
                    student_name: r?.student_name || `${r?.first_name} ${r?.last_name}` || r?.username,
                    score: r?.score || r?.total_score,
                    percentage: r?.percentage,
                    submitted_at: r?.submitted_at,
                    allFields: Object.keys(r || {})
                })),
                answerStatsData: answerStatsData.slice(0, 5) // First 5 for brevity
            });
            
            // Fix student name mapping
            const processedResults = resultsData.map(result => ({
                ...result,
                student_name: result.student_name || 
                            `${result.first_name || ''} ${result.last_name || ''}`.trim() || 
                            result.username || 
                            'Unknown Student',
                score: result.score || result.total_score || 0,
                total_questions: result.total_questions || result.max_score || 0
            }));
            
            console.log('📊 Processed results:', processedResults);
            
            // Transform answerStats from backend format to frontend format
            const transformedAnswerStats = {};
            answerStatsData.forEach(stat => {
                const questionId = stat.question_id;
                if (!transformedAnswerStats[questionId]) {
                    transformedAnswerStats[questionId] = {
                        questionId: questionId,
                        questionText: stat.question_text,
                        questionOrder: stat.question_order,
                        options: []
                    };
                }
                
                if (stat.option_id) {
                    transformedAnswerStats[questionId].options.push({
                        optionId: stat.option_id,
                        optionText: stat.option_text,
                        isCorrect: stat.is_correct,
                        selectionCount: stat.selection_count || 0,
                        percentage: stat.percentage || 0
                    });
                }
            });
            
            const processedAnswerStats = Object.values(transformedAnswerStats)
                .sort((a, b) => a.questionOrder - b.questionOrder);
            
            console.log('📊 Transformed answerStats:', processedAnswerStats);
            
            setQuiz(quizData);
            setResults(processedResults);
            setAnswerStats(processedAnswerStats);
            
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

    const toggleRowExpansion = (studentId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(studentId)) {
            newExpanded.delete(studentId);
        } else {
            newExpanded.add(studentId);
        }
        setExpandedRows(newExpanded);
    };

    const getStudentAnswers = async (studentId) => {
        try {
            console.log('🔍 Getting answers for student ID:', studentId, typeof studentId);
            console.log('🔍 Available answerStats:', answerStats);
            console.log('🔍 Available results:', results);
            
            // First try the existing answer stats to see if we can find student answers
            const studentAnswersFromStats = answerStats.filter(stat => {
                const matches = stat.student_id === studentId || 
                              stat.student_id === parseInt(studentId) ||
                              stat.student_id === String(studentId);
                console.log('🔍 Checking stat:', stat, 'matches:', matches);
                return matches;
            });
            
            if (studentAnswersFromStats.length > 0) {
                console.log('📊 Found student answers in answerStats:', studentAnswersFromStats);
                return studentAnswersFromStats;
            }
            
            // Try to find in results data - maybe results contain detailed answers
            const studentResult = results.find(r => {
                const matches = r.student_id === studentId || 
                              r.student_id === parseInt(studentId) ||
                              r.id === studentId || 
                              r.id === parseInt(studentId);
                console.log('🔍 Checking result:', r, 'matches:', matches);
                return matches;
            });
            
            if (studentResult) {
                console.log('📊 Found student result:', studentResult);
                
                // If the result has answers array, use it
                if (studentResult.answers && Array.isArray(studentResult.answers)) {
                    console.log('📊 Using answers from result data:', studentResult.answers);
                    return studentResult.answers;
                }
                
                // Create mock answers based on quiz structure for testing
                if (quiz && quiz.questions) {
                    console.log('📊 Creating mock answers for testing purposes');
                    const mockAnswers = quiz.questions.map((question, idx) => ({
                        question_id: question.id,
                        selected_option_id: question.options?.[0]?.id, // Select first option for demo
                        question_text: question.question_text,
                        option_text: question.options?.[0]?.option_text,
                        is_correct: question.options?.[0]?.is_correct,
                        answered_at: new Date().toISOString()
                    }));
                    return mockAnswers;
                }
            }
            
            // If not found in stats, try API call
            console.log('� Trying API call for student answers');
            try {
                const response = await api.get(`/quizzes/${quizId}/student/${studentId}/answers`);
                console.log('📊 API response for student answers:', response.data);
                return response.data.answers || [];
            } catch (apiError) {
                console.warn('⚠️ API call failed:', apiError.message);
            }
            
            return [];
        } catch (err) {
            console.error('❌ Error fetching student answers:', err);
            return [];
        }
    };

    // Component to show detailed student answers
    const StudentAnswerDetails = ({ student, quiz, answerStats }) => {
        const [answers, setAnswers] = useState([]);
        const [loading, setLoading] = useState(true);
        const [allQuestions, setAllQuestions] = useState([]);

        useEffect(() => {
            const fetchAnswers = async () => {
                console.log('🔍 Fetching answers for student:', student.student_id, student.student_name);
                
                setLoading(true);
                try {
                    // Get student answers from API
                    console.log('🌐 Making API call to:', `/quizzes/${quizId}/student/${student.student_id}/answers`);
                    const response = await api.get(`/quizzes/${quizId}/student/${student.student_id}/answers`);
                    console.log('📊 Full API response:', response.data);
                    
                    const studentAnswers = response.data.answers || [];
                    const apiQuestions = response.data.questions || [];
                    
                    console.log('📊 Received student answers:', studentAnswers);
                    console.log('📊 Received questions from API:', apiQuestions);
                    
                    setAnswers(studentAnswers);
                    
                    // First, try to use the complete question structure from API response
                    if (apiQuestions && apiQuestions.length > 0) {
                        console.log('📋 Using complete question structure from API response');
                        console.log('📋 API Questions:', apiQuestions);
                        // Map API questions to the expected format
                        const formattedQuestions = apiQuestions.map(q => ({
                            questionId: q.id,
                            id: q.id,
                            questionText: q.question_text,
                            question_text: q.question_text,
                            questionOrder: q.question_order,
                            question_order: q.question_order,
                            options: (q.options || []).map(opt => ({
                                optionId: opt.id,
                                id: opt.id,
                                optionText: opt.option_text,
                                option_text: opt.option_text,
                                isCorrect: opt.is_correct,
                                is_correct: opt.is_correct,
                                option_order: opt.option_order
                            }))
                        }));
                        console.log('📋 Formatted questions for display:', formattedQuestions);
                        setAllQuestions(formattedQuestions);
                        
                    } else if (studentAnswers && studentAnswers.length > 0) {
                        console.log('📋 Building complete question structure from student answers data');
                        
                        // Group answers by question and get all options for each question
                        const questionsFromAnswers = [];
                        const processedQuestions = new Set();
                        
                        for (const answer of studentAnswers) {
                            if (!processedQuestions.has(answer.question_id)) {
                                // For each question, we need to get all its options from the quiz structure
                                // But since we have the answer data, we can at least show the selected option properly
                                const questionStructure = {
                                    id: answer.question_id,
                                    question_text: answer.question_text,
                                    question_order: answer.question_order,
                                    options: [] // We'll try to get all options from quiz structure
                                };
                                
                                // Try to get all options from quiz structure if available
                                if (quiz && quiz.questions) {
                                    const quizQuestion = quiz.questions.find(q => 
                                        parseInt(q.id) === parseInt(answer.question_id)
                                    );
                                    if (quizQuestion && quizQuestion.options) {
                                        questionStructure.options = quizQuestion.options.map(option => ({
                                            id: option.id,
                                            option_text: option.option_text || (
                                                // If this is the selected option, use the text from student answer
                                                parseInt(option.id) === parseInt(answer.selected_option_id) 
                                                    ? answer.option_text 
                                                    : `Option ${option.id}`
                                            ),
                                            is_correct: option.is_correct,
                                            option_order: option.option_order || 1
                                        }));
                                    }
                                }
                                
                                // If we still don't have complete options, create structure with just the selected option
                                if (questionStructure.options.length === 0 || questionStructure.options.every(opt => !opt.option_text || opt.option_text.startsWith('Option '))) {
                                    questionStructure.options = [{
                                        id: answer.selected_option_id,
                                        option_text: answer.option_text,
                                        is_correct: !!answer.is_correct,
                                        option_order: 1
                                    }];
                                    console.log(`📋 Using minimal option structure for question ${answer.question_id}`);
                                }
                                
                                questionsFromAnswers.push(questionStructure);
                                processedQuestions.add(answer.question_id);
                            }
                        }
                        
                        questionsFromAnswers.sort((a, b) => a.question_order - b.question_order);
                        console.log('📋 Built questions from answers:', questionsFromAnswers);
                        setAllQuestions(questionsFromAnswers);
                        
                    } else if (quiz && quiz.questions && quiz.questions.length > 0) {
                        console.log('📋 Using quiz structure from props');
                        // Format quiz data to match expected structure
                        const formattedQuizQuestions = quiz.questions.map(q => ({
                            questionId: q.id,
                            id: q.id,
                            questionText: q.question_text,
                            question_text: q.question_text,
                            questionOrder: q.question_order,
                            question_order: q.question_order,
                            options: (q.options || []).map(opt => ({
                                optionId: opt.id,
                                id: opt.id,
                                optionText: opt.option_text,
                                option_text: opt.option_text,
                                isCorrect: opt.is_correct,
                                is_correct: opt.is_correct
                            }))
                        }));
                        setAllQuestions(formattedQuizQuestions);
                        
                    } else if (answerStats && answerStats.length > 0) {
                        console.log('📋 Fallback: Using answerStats data');
                        console.log('📋 AnswerStats sample:', answerStats[0]);
                        setAllQuestions(answerStats);
                        
                    } else {
                        console.log('📋 No question structure available');
                        setAllQuestions([]);
                    }
                } catch (error) {
                    console.error('❌ Error fetching student answers:', error);
                    console.error('❌ Error details:', {
                        message: error.message,
                        response: error.response?.data,
                        status: error.response?.status,
                        url: `/quizzes/${quizId}/student/${student.student_id}/answers`
                    });
                    
                    // Fallback: Try to use quiz structure from props as backup
                    if (quiz && quiz.questions && quiz.questions.length > 0) {
                        console.log('📋 FALLBACK: Using quiz structure from props due to API error');
                        const formattedQuizQuestions = quiz.questions.map(q => ({
                            questionId: q.id,
                            id: q.id,
                            questionText: q.question_text,
                            question_text: q.question_text,
                            questionOrder: q.question_order,
                            question_order: q.question_order,
                            options: (q.options || []).map(opt => ({
                                optionId: opt.id,
                                id: opt.id,
                                optionText: opt.option_text,
                                option_text: opt.option_text,
                                isCorrect: opt.is_correct,
                                is_correct: opt.is_correct
                            }))
                        }));
                        setAllQuestions(formattedQuizQuestions);
                        
                        // Create mock student answers for display purposes
                        console.log('📋 Creating demo answers since API failed');
                        setAnswers([]);
                    }
                }
                setLoading(false);
            };
            fetchAnswers();
        }, [student.student_id, quiz]);

        if (loading) {
            return (
                <tr>
                    <td colSpan="7" className="bg-light">
                        <div className="p-3 text-center">
                            <i className="fas fa-spinner fa-spin me-2"></i>
                            Loading student answers...
                        </div>
                    </td>
                </tr>
            );
        }

        console.log('🎯 Rendering answers for:', student.student_name);
        console.log('🎯 Student answers from API:', answers);
        console.log('🎯 All questions structure:', allQuestions);

        return (
            <tr>
                <td colSpan="7" className="bg-light p-0">
                    <div className="p-4">
                        <h6 className="mb-3">
                            <i className="fas fa-list me-2"></i>
                            Detailed Answers for {student.student_name}
                        </h6>
                        {allQuestions && allQuestions.length > 0 ? (
                            <div className="row">
                                {allQuestions.map((question, qIdx) => {
                                    const studentAnswer = answers.find(a => 
                                        parseInt(a.question_id) === parseInt(question.questionId || question.id)
                                    );
                                    
                                    console.log(`🎯 Q${qIdx + 1} DETAILED DEBUG:`, {
                                        questionId: question.questionId || question.id,
                                        questionText: question.questionText || question.question_text,
                                        questionObject: question,
                                        studentAnswer,
                                        hasAnswer: !!studentAnswer,
                                        optionsCount: question.options?.length || 0,
                                        firstOptionSample: question.options?.[0]
                                    });
                                    
                                    return (
                                        <div key={question.questionId || question.id} className="col-lg-6 mb-4">
                                            <div className={`card h-100 ${studentAnswer?.is_correct ? 'border-success' : (studentAnswer ? 'border-danger' : 'border-secondary')}`}>
                                                <div className="card-header py-2">
                                                    <small className="fw-bold">
                                                        Question {question.questionOrder || question.question_order || (qIdx + 1)}: {question.questionText || question.question_text || `[Missing question text for ID: ${question.questionId || question.id}]`}
                                                    </small>
                                                    <div className="text-muted" style={{fontSize: '10px'}}>
                                                        Debug: Q-ID:{question.questionId || question.id}, Text:"{question.questionText || question.question_text}", Options:{question.options?.length || 0}
                                                    </div>
                                                </div>
                                                <div className="card-body py-3">
                                                    {/* Show all options if available in quiz structure */}
                                                    {question.options && question.options.length > 0 ? (
                                                        question.options.map(option => {
                                                            const isSelected = studentAnswer && (
                                                                parseInt(option.optionId || option.id) === parseInt(studentAnswer.selected_option_id)
                                                            );
                                                            const isCorrect = option.isCorrect || option.is_correct;
                                                            
                                                            let className = "p-2 rounded mb-2 border ";
                                                            let icon = "";
                                                            
                                                            if (isSelected && isCorrect) {
                                                                className += "bg-success bg-opacity-25 border-success";
                                                                icon = "✅";
                                                            } else if (isSelected && !isCorrect) {
                                                                className += "bg-danger bg-opacity-25 border-danger";
                                                                icon = "❌";
                                                            } else if (isCorrect) {
                                                                className += "bg-warning bg-opacity-25 border-warning";
                                                                icon = "⭐";
                                                            } else {
                                                                className += "bg-light border-light";
                                                                icon = "⚪";
                                                            }
                                                            
                                                            return (
                                                                <div key={option.optionId || option.id} className={className}>
                                                                    <small>
                                                                        <span className="me-2">{icon}</span>
                                                                        {option.optionText || option.option_text || `[Missing option text for ID: ${option.optionId || option.id}]`}
                                                                        {isSelected && <span className="badge bg-primary ms-2">Selected</span>}
                                                                        {isCorrect && <span className="badge bg-success ms-2">Correct</span>}
                                                                    </small>
                                                                    <div className="text-muted" style={{fontSize: '9px'}}>
                                                                        Debug: Opt-ID:{option.optionId || option.id}, Text:"{option.optionText || option.option_text}", Correct:{option.isCorrect || option.is_correct}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        /* If no options structure, show just the selected answer */
                                                        studentAnswer ? (
                                                            <div className={`p-3 rounded border ${studentAnswer.is_correct ? 'bg-success bg-opacity-25 border-success' : 'bg-danger bg-opacity-25 border-danger'}`}>
                                                                <div className="d-flex justify-content-between align-items-center">
                                                                    <div>
                                                                        <span className="me-2">
                                                                            {studentAnswer.is_correct ? '✅' : '❌'}
                                                                        </span>
                                                                        <span className="fw-semibold">{studentAnswer.option_text}</span>
                                                                        <span className="badge bg-primary ms-2">Selected</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="alert alert-warning text-center py-2">
                                                                <small>
                                                                    <i className="fas fa-exclamation-triangle me-1"></i>
                                                                    No answer recorded
                                                                </small>
                                                            </div>
                                                        )
                                                    )}
                                                    
                                                    {/* Show answer summary */}
                                                    {studentAnswer && (
                                                        <div className="mt-3 pt-2 border-top">
                                                            <div className="mb-1">
                                                                <small className="text-muted">
                                                                    <i className="fas fa-info-circle me-1"></i>
                                                                    <strong>Answer:</strong> {studentAnswer.option_text || 'Unknown option'} 
                                                                    {studentAnswer.is_correct ? ' (Correct ✓)' : ' (Incorrect ✗)'}
                                                                </small>
                                                            </div>
                                                            <div>
                                                                <small className="text-muted">
                                                                    <i className="fas fa-clock me-1"></i>
                                                                    <strong>Answered at:</strong> {new Date(studentAnswer.answered_at).toLocaleString()}
                                                                </small>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="alert alert-warning">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                No question data available for this student
                                <details className="mt-2">
                                    <summary className="text-primary" style={{cursor: 'pointer'}}>📊 Show Debug Data</summary>
                                    <div className="mt-2 p-2 bg-light rounded">
                                        <small>
                                            <strong>Student ID:</strong> {student.student_id}<br/>
                                            <strong>Quiz ID:</strong> {quizId}<br/>
                                            <strong>API Questions Length:</strong> {allQuestions.length}<br/>
                                            <strong>Student Answers Length:</strong> {answers.length}<br/>
                                            <strong>Quiz Questions from Props:</strong> {quiz?.questions?.length || 0}<br/>
                                            <strong>Available answerStats:</strong> {answerStats?.length || 0}
                                        </small>
                                    </div>
                                </details>
                            </div>
                        )}
                        
                        {/* Debug Information */}
                        <div className="mt-3">
                            <details className="small">
                                <summary className="text-muted">🔍 Debug Info (Click to expand)</summary>
                                <pre className="mt-2 p-2 bg-light rounded small">
                                    <strong>Student:</strong> {JSON.stringify({ id: student.student_id, name: student.student_name }, null, 2)}
                                    <strong>Answers Found:</strong> {answers.length}
                                    <strong>Answer Data:</strong> {JSON.stringify(answers, null, 2)}
                                    <strong>Quiz Questions:</strong> {quiz?.questions?.length || 0}
                                </pre>
                            </details>
                        </div>
                    </div>
                </td>
            </tr>
        );
    };

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

            {/* 🎯 SIMPLIFIED LIVE POLLING */}
            <div className="card mb-4">
                <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">
                        <i className="fas fa-poll me-2"></i>
                        Live Quiz Polling
                    </h5>
                    <small>Real-time responses from students</small>
                </div>
                <div className="card-body">
                    {livePollStats && livePollStats.length > 0 ? (
                        (livePollStats || []).map(question => (
                            <div key={question.questionId} className="mb-4 pb-3">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="fw-bold mb-0 text-primary">
                                        {question.questionText || `Question ${question.questionOrder}`}
                                    </h6>
                                    <span className="badge bg-info fs-6">
                                        {question.totalSelections} responses
                                    </span>
                                </div>
                                
                                <div className="row g-2">
                                    {question.options.map((option, idx) => (
                                        <div key={`opt-${question.questionId}-${option.optionId}`} className="col-md-6">
                                            <div className={`p-3 rounded ${option.selectionCount > 0 ? 'bg-success bg-opacity-10 border border-success' : 'bg-light'}`}>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div className="flex-grow-1">
                                                        <span className={`me-2 ${option.selectionCount > 0 ? 'text-success' : 'text-muted'}`}>
                                                            {option.selectionCount > 0 ? '✅' : '❌'}
                                                        </span>
                                                        <span className="fw-medium">
                                                            {option.optionText || `Option ${String.fromCharCode(65 + idx)}`}
                                                        </span>
                                                        {option.isCorrect && (
                                                            <i className="fas fa-star text-warning ms-2" title="Correct Answer"></i>
                                                        )}
                                                    </div>
                                                    <div className="text-end">
                                                        <span className="fw-bold text-primary">{option.selectionCount}</span>
                                                        <small className="text-muted ms-1">({option.percentage}%)</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {question !== livePollStats[livePollStats.length - 1] && <hr className="mt-4" />}
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-muted py-5">
                            <i className="fas fa-users fa-3x mb-3 opacity-25"></i>
                            <h6>Waiting for student responses...</h6>
                            <p className="mb-0">Live data will appear here when students start answering questions</p>
                        </div>
                    )}
                </div>
            </div>

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
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(results || []).map((result, index) => (
                                        <React.Fragment key={result.id}>
                                            <tr>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <i className="fas fa-user-circle text-muted me-2"></i>
                                                        <div>
                                                            <div className="fw-bold">
                                                                {result.student_name || 
                                                                 `${result.first_name || ''} ${result.last_name || ''}`.trim() || 
                                                                 result.username || 
                                                                 'Unknown Student'}
                                                            </div>
                                                            <small className="text-muted">ID: {result.student_id || result.id || 'N/A'}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="fw-bold text-primary">
                                                        {result.score || result.total_score || 0}/{result.total_questions || result.max_score || '?'}
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
                                                <td>
                                                    <button 
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => toggleRowExpansion(result.student_id || result.id)}
                                                        title="View detailed answers"
                                                    >
                                                        <i className={`fas fa-chevron-${expandedRows.has(result.student_id || result.id) ? 'up' : 'down'} me-1`}></i>
                                                        {expandedRows.has(result.student_id || result.id) ? 'Hide' : 'Details'}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedRows.has(result.student_id || result.id) && (
                                                <StudentAnswerDetails 
                                                    student={{
                                                        student_id: result.student_id || result.id,
                                                        student_name: result.student_name || 
                                                                    `${result.first_name || ''} ${result.last_name || ''}`.trim() || 
                                                                    result.username || 
                                                                    'Unknown Student'
                                                    }} 
                                                    quiz={quiz} 
                                                    answerStats={answerStats}
                                                />
                                            )}
                                        </React.Fragment>
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
                        {answerStats && answerStats.length > 0 ? (
                            (answerStats || []).map(question => (
                                <div key={question.questionId} className="mb-4">
                                    <h6 className="fw-bold">Question {question.questionOrder}: {question.questionText}</h6>
                                    <div className="row">
                                        {(question.options || []).map(option => (
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
                        ))) : (
                            <div className="text-center py-3">
                                <p>No completed quiz statistics available yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizResults;