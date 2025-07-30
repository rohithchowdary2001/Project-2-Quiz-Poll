import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const QuizManagement = () => {
    const { user } = useAuth();
    const [quizzes, setQuizzes] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [quizForm, setQuizForm] = useState({
        title: '',
        description: '',
        classId: '',
        deadline: '',
        timeLimit: 30,
        questions: [
            {
                questionText: '',
                questionType: 'single_choice',
                points: 1,
                options: [
                    { text: '', isCorrect: false },
                    { text: '', isCorrect: false }
                ]
            }
        ]
    });

    useEffect(() => {
        fetchQuizzes();
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchQuizzes();
        }
    }, [selectedClassId]);

    const fetchQuizzes = async () => {
        try {
            console.log('QuizManagement - Fetching quizzes...');
            setLoading(true);
            const params = selectedClassId ? `?classId=${selectedClassId}&sortBy=created_at&sortOrder=DESC` : '?sortBy=created_at&sortOrder=DESC';
            const response = await api.get(`/quizzes${params}`);
            console.log('QuizManagement - Quizzes fetched:', response.data);
            setQuizzes(response.data.quizzes || []);
            setError('');
        } catch (err) {
            console.error('QuizManagement - Error fetching quizzes:', err);
            setError(err.response?.data?.message || 'Failed to fetch quizzes');
        } finally {
            setLoading(false);
        }
    };

    const fetchClasses = async () => {
        try {
            console.log('QuizManagement - Fetching classes...');
            const response = await api.get('/classes');
            console.log('QuizManagement - Classes fetched:', response.data);
            setClasses(response.data.classes || []);
        } catch (err) {
            console.error('QuizManagement - Error fetching classes:', err);
            setError(err.response?.data?.message || 'Failed to fetch classes');
        }
    };

    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        try {
            console.log('QuizManagement - Creating quiz:', quizForm);
            
            // Validate quiz form
            if (!quizForm.title || !quizForm.classId) {
                setError('Title and class are required');
                return;
            }

            if (quizForm.questions.length === 0) {
                setError('At least one question is required');
                return;
            }

            // Validate questions
            for (let i = 0; i < quizForm.questions.length; i++) {
                const question = quizForm.questions[i];
                if (!question.questionText.trim()) {
                    setError(`Question ${i + 1} text is required`);
                    return;
                }
                if (question.options.length < 2) {
                    setError(`Question ${i + 1} must have at least 2 options`);
                    return;
                }
                if (!question.options.some(opt => opt.isCorrect)) {
                    setError(`Question ${i + 1} must have at least one correct answer`);
                    return;
                }
            }

            const response = await api.post('/quizzes', {
                title: quizForm.title,
                description: quizForm.description,
                classId: quizForm.classId,
                deadline: quizForm.deadline || null,
                timeLimit: quizForm.timeLimit,
                questions: quizForm.questions
            });
            
            console.log('QuizManagement - Quiz created:', response.data);
            
            setShowCreateModal(false);
            resetQuizForm();
            fetchQuizzes();
            alert('Quiz created successfully!');
        } catch (err) {
            console.error('QuizManagement - Error creating quiz:', err);
            setError(err.response?.data?.message || 'Failed to create quiz');
        }
    };

    const handleDeleteQuiz = async (quizId, quizTitle) => {
        if (!window.confirm(`Are you sure you want to delete "${quizTitle}"?`)) {
            return;
        }

        try {
            console.log(`QuizManagement - Deleting quiz ${quizId}`);
            await api.delete(`/quizzes/${quizId}`);
            console.log('QuizManagement - Quiz deleted successfully');
            
            fetchQuizzes();
            alert('Quiz deleted successfully!');
        } catch (err) {
            console.error('QuizManagement - Error deleting quiz:', err);
            alert(err.response?.data?.message || 'Failed to delete quiz');
        }
    };

    const addQuestion = () => {
        setQuizForm({
            ...quizForm,
            questions: [
                ...quizForm.questions,
                {
                    questionText: '',
                    questionType: 'single_choice',
                    points: 1,
                    options: [
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false }
                    ]
                }
            ]
        });
    };

    const removeQuestion = (questionIndex) => {
        const newQuestions = quizForm.questions.filter((_, index) => index !== questionIndex);
        setQuizForm({ ...quizForm, questions: newQuestions });
    };

    const updateQuestion = (questionIndex, field, value) => {
        const newQuestions = [...quizForm.questions];
        newQuestions[questionIndex][field] = value;
        setQuizForm({ ...quizForm, questions: newQuestions });
    };

    const addOption = (questionIndex) => {
        const newQuestions = [...quizForm.questions];
        newQuestions[questionIndex].options.push({ text: '', isCorrect: false });
        setQuizForm({ ...quizForm, questions: newQuestions });
    };

    const removeOption = (questionIndex, optionIndex) => {
        const newQuestions = [...quizForm.questions];
        newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter((_, index) => index !== optionIndex);
        setQuizForm({ ...quizForm, questions: newQuestions });
    };

    const updateOption = (questionIndex, optionIndex, field, value) => {
        const newQuestions = [...quizForm.questions];
        newQuestions[questionIndex].options[optionIndex][field] = value;
        setQuizForm({ ...quizForm, questions: newQuestions });
    };

    const resetQuizForm = () => {
        setQuizForm({
            title: '',
            description: '',
            classId: '',
            deadline: '',
            timeLimit: 30,
            questions: [
                {
                    questionText: '',
                    questionType: 'single_choice',
                    points: 1,
                    options: [
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false }
                    ]
                }
            ]
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No deadline';
        return new Date(dateString).toLocaleString();
    };

    const getStatusBadge = (quiz) => {
        const now = new Date();
        const deadline = quiz.deadline ? new Date(quiz.deadline) : null;
        
        if (deadline && now > deadline) {
            return <span className="badge bg-danger">Expired</span>;
        }
        return <span className="badge bg-success">Active</span>;
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
                <h2>Quiz Management</h2>
                <div>
                    <button className="btn btn-success me-2" onClick={() => setShowCreateModal(true)}>
                        <i className="fas fa-plus me-2"></i>
                        Create Quiz
                    </button>
                    <button className="btn btn-primary" onClick={fetchQuizzes}>
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
                    No quizzes found. Create your first quiz to get started!
                </div>
            ) : (
                <div className="card">
                    <div className="card-header">
                        <h5 className="mb-0">Your Quizzes ({quizzes.length})</h5>
                    </div>
                    <div className="card-body">
                        <div className="table-responsive">
                            <table className="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Class</th>
                                        <th>Questions</th>
                                        <th>Submissions</th>
                                        <th>Deadline</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quizzes.map(quiz => (
                                        <tr key={quiz.id}>
                                            <td>
                                                <div className="fw-bold">{quiz.title}</div>
                                                <small className="text-muted">{quiz.description}</small>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark">
                                                    {quiz.class_name}
                                                </span>
                                            </td>
                                            <td>{quiz.question_count || 0}</td>
                                            <td>{quiz.submission_count || 0}</td>
                                            <td>{formatDate(quiz.deadline)}</td>
                                            <td>{getStatusBadge(quiz)}</td>
                                            <td>
                                                <div className="btn-group" role="group">
                                                    <a 
                                                        href={`/professor/quiz-results/${quiz.id}`}
                                                        className="btn btn-sm btn-outline-primary"
                                                    >
                                                        <i className="fas fa-chart-bar"></i>
                                                    </a>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Quiz Modal */}
            {showCreateModal && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Create New Quiz</h5>
                                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
                            </div>
                            <form onSubmit={handleCreateQuiz}>
                                <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                    {/* Quiz Details */}
                                    <div className="mb-4">
                                        <h6>Quiz Details</h6>
                                        <div className="row">
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Title</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={quizForm.title}
                                                    onChange={(e) => setQuizForm({...quizForm, title: e.target.value})}
                                                    required
                                                    placeholder="Enter quiz title"
                                                />
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Class</label>
                                                <select
                                                    className="form-select"
                                                    value={quizForm.classId}
                                                    onChange={(e) => setQuizForm({...quizForm, classId: e.target.value})}
                                                    required
                                                >
                                                    <option value="">Select a class</option>
                                                    {classes.map(cls => (
                                                        <option key={cls.id} value={cls.id}>
                                                            {cls.name} ({cls.class_code})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Deadline (Optional)</label>
                                                <input
                                                    type="datetime-local"
                                                    className="form-control"
                                                    value={quizForm.deadline}
                                                    onChange={(e) => setQuizForm({...quizForm, deadline: e.target.value})}
                                                />
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Time Limit (minutes)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={quizForm.timeLimit}
                                                    onChange={(e) => setQuizForm({...quizForm, timeLimit: parseInt(e.target.value)})}
                                                    min="1"
                                                    max="300"
                                                />
                                            </div>
                                            <div className="col-12 mb-3">
                                                <label className="form-label">Description</label>
                                                <textarea
                                                    className="form-control"
                                                    rows="3"
                                                    value={quizForm.description}
                                                    onChange={(e) => setQuizForm({...quizForm, description: e.target.value})}
                                                    placeholder="Enter quiz description (optional)"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Questions */}
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h6>Questions</h6>
                                            <button type="button" className="btn btn-sm btn-success" onClick={addQuestion}>
                                                <i className="fas fa-plus me-1"></i>
                                                Add Question
                                            </button>
                                        </div>

                                        {quizForm.questions.map((question, questionIndex) => (
                                            <div key={questionIndex} className="card mb-3">
                                                <div className="card-header">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <h6 className="mb-0">Question {questionIndex + 1}</h6>
                                                        {quizForm.questions.length > 1 && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-danger"
                                                                onClick={() => removeQuestion(questionIndex)}
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="card-body">
                                                    <div className="row mb-3">
                                                        <div className="col-md-8">
                                                            <label className="form-label">Question Text</label>
                                                            <textarea
                                                                className="form-control"
                                                                rows="2"
                                                                value={question.questionText}
                                                                onChange={(e) => updateQuestion(questionIndex, 'questionText', e.target.value)}
                                                                required
                                                                placeholder="Enter your question"
                                                            />
                                                        </div>
                                                        <div className="col-md-4">
                                                            <label className="form-label">Points</label>
                                                            <input
                                                                type="number"
                                                                className="form-control"
                                                                value={question.points}
                                                                onChange={(e) => updateQuestion(questionIndex, 'points', parseInt(e.target.value))}
                                                                min="1"
                                                                max="10"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="mb-3">
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <label className="form-label">Answer Options</label>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-success"
                                                                onClick={() => addOption(questionIndex)}
                                                            >
                                                                <i className="fas fa-plus me-1"></i>
                                                                Add Option
                                                            </button>
                                                        </div>

                                                        {question.options.map((option, optionIndex) => (
                                                            <div key={optionIndex} className="input-group mb-2">
                                                                <div className="input-group-text">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={option.isCorrect}
                                                                        onChange={(e) => updateOption(questionIndex, optionIndex, 'isCorrect', e.target.checked)}
                                                                        title="Mark as correct answer"
                                                                    />
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    value={option.text}
                                                                    onChange={(e) => updateOption(questionIndex, optionIndex, 'text', e.target.value)}
                                                                    placeholder={`Option ${optionIndex + 1}`}
                                                                    required
                                                                />
                                                                {question.options.length > 2 && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-outline-danger"
                                                                        onClick={() => removeOption(questionIndex, optionIndex)}
                                                                    >
                                                                        <i className="fas fa-trash"></i>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Create Quiz
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizManagement; 