import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const EditQuiz = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [canEdit, setCanEdit] = useState(null);
    const [editWarning, setEditWarning] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        deadline: '',
        time_limit_minutes: 30,
        questions: []
    });

    useEffect(() => {
        console.log('🚀 EditQuiz component mounted with quizId:', quizId);
        if (quizId) {
            fetchQuizData();
            checkEditPermission();
        }
    }, [quizId]);

    // Debug useEffect to track formData changes
    useEffect(() => {
        console.log('📊 FormData updated:', formData);
        console.log('📝 Questions count:', formData.questions.length);
        formData.questions.forEach((q, idx) => {
            console.log(`  Question ${idx + 1}: "${q.question_text}" with ${q.options.length} options`);
        });
    }, [formData]);

    const fetchQuizData = async () => {
        try {
            setLoading(true);
            console.log('🔄 Fetching quiz data for ID:', quizId);
            
            const response = await api.get(`/quizzes/${quizId}`);
            const quizData = response.data.quiz;
            
            console.log('📋 Raw quiz data received:', JSON.stringify(quizData, null, 2));
            console.log('📝 Raw questions data:', JSON.stringify(quizData.questions, null, 2));
            
            setQuiz(quizData);
            
            // Process questions and options with proper mapping
            const processedQuestions = (quizData.questions || []).map((q, qIdx) => {
                console.log(`📊 Processing question ${qIdx + 1}:`, JSON.stringify(q, null, 2));
                console.log(`📊 Question text options:`, {
                    question_text: q.question_text,
                    questionText: q.questionText,  // Backend uses camelCase
                    text: q.text,
                    title: q.title,
                    'raw question object': q
                });
                
                const processedOptions = (q.options || []).map((opt, oIdx) => {
                    console.log(`  📌 Processing option ${oIdx + 1}:`, JSON.stringify(opt, null, 2));
                    return {
                        id: opt.id,
                        option_text: opt.option_text || opt.text || opt.optionText || '',
                        is_correct: Boolean(opt.is_correct || opt.correct || opt.isCorrect),
                        option_order: opt.option_order || opt.order || (oIdx + 1)
                    };
                });
                
                // Try multiple field names for question text (backend uses camelCase, frontend expects snake_case)
                const questionText = q.question_text || q.questionText || q.text || q.title || '';
                console.log(`📝 Final question text for Q${qIdx + 1}:`, questionText);
                
                return {
                    id: q.id,
                    question_text: questionText,
                    question_type: q.question_type || q.questionType || 'multiple_choice',
                    points: parseInt(q.points) || 1,
                    question_time_limit: q.question_time_limit || q.questionTimeLimit,
                    is_required: Boolean(q.is_required !== false || q.isRequired !== false), // Default to true
                    options: processedOptions
                };
            });
            
            const formattedDeadline = quizData.deadline 
                ? new Date(quizData.deadline).toISOString().slice(0, 16)
                : '';
            
            const newFormData = {
                title: quizData.title || '',
                description: quizData.description || '',
                deadline: formattedDeadline,
                time_limit_minutes: parseInt(quizData.time_limit_minutes) || 30,
                questions: processedQuestions
            };
            
            console.log('✅ Final form data:', JSON.stringify(newFormData, null, 2));
            console.log('📝 Questions with text and options:');
            newFormData.questions.forEach((q, idx) => {
                console.log(`  Q${idx + 1}: "${q.question_text}" (${q.options.length} options)`);
                q.options.forEach((opt, oIdx) => {
                    console.log(`    O${oIdx + 1}: "${opt.option_text}" (correct: ${opt.is_correct})`);
                });
            });
            
            setFormData(newFormData);
            setError('');
            
        } catch (err) {
            console.error('❌ Error fetching quiz data:', err);
            console.error('❌ Error response:', err.response?.data);
            setError(err.response?.data?.message || 'Failed to fetch quiz data');
        } finally {
            setLoading(false);
        }
    };

    const checkEditPermission = async () => {
        try {
            const response = await api.get(`/quizzes/${quizId}/can-edit`);
            setCanEdit(response.data.canEdit);
            setEditWarning(response.data.message);
        } catch (err) {
            console.error('Error checking edit permission:', err);
        }
    };

    const handleFormChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleQuestionChange = (questionIndex, field, value) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.map((q, idx) => 
                idx === questionIndex ? { ...q, [field]: value } : q
            )
        }));
    };

    const handleOptionChange = (questionIndex, optionIndex, field, value) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.map((q, qIdx) => 
                qIdx === questionIndex ? {
                    ...q,
                    options: q.options.map((opt, oIdx) => 
                        oIdx === optionIndex ? { ...opt, [field]: value } : opt
                    )
                } : q
            )
        }));
    };

    const addQuestion = () => {
        setFormData(prev => ({
            ...prev,
            questions: [...prev.questions, {
                question_text: '',
                question_type: 'multiple_choice',
                points: 1,
                question_time_limit: null,
                is_required: true,
                options: [
                    { option_text: '', is_correct: true, option_order: 1 },
                    { option_text: '', is_correct: false, option_order: 2 },
                    { option_text: '', is_correct: false, option_order: 3 },
                    { option_text: '', is_correct: false, option_order: 4 }
                ]
            }]
        }));
    };

    const removeQuestion = (questionIndex) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.filter((_, idx) => idx !== questionIndex)
        }));
    };

    const addOption = (questionIndex) => {
        const questionOptions = formData.questions[questionIndex].options;
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.map((q, idx) => 
                idx === questionIndex ? {
                    ...q,
                    options: [...q.options, {
                        option_text: '',
                        is_correct: false,
                        option_order: questionOptions.length + 1
                    }]
                } : q
            )
        }));
    };

    const removeOption = (questionIndex, optionIndex) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.map((q, qIdx) => 
                qIdx === questionIndex ? {
                    ...q,
                    options: q.options.filter((_, oIdx) => oIdx !== optionIndex)
                } : q
            )
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.title.trim()) {
            setError('Title is required');
            return;
        }

        if (formData.questions.length === 0) {
            setError('At least one question is required');
            return;
        }

        // Validate questions
        for (let i = 0; i < formData.questions.length; i++) {
            const question = formData.questions[i];
            if (!question.question_text.trim()) {
                setError(`Question ${i + 1} text is required`);
                return;
            }

            if (!question.options || question.options.length < 2) {
                setError(`Question ${i + 1} must have at least 2 options`);
                return;
            }

            const correctOptions = question.options.filter(opt => opt.is_correct);
            if (correctOptions.length === 0) {
                setError(`Question ${i + 1} must have at least one correct option`);
                return;
            }

            for (let j = 0; j < question.options.length; j++) {
                if (!question.options[j].option_text.trim()) {
                    setError(`Question ${i + 1}, Option ${j + 1} text is required`);
                    return;
                }
            }
        }

        try {
            setSaving(true);
            setError('');

            const response = await api.put(`/quizzes/${quizId}/edit`, formData);
            
            alert(response.data.message);
            
            // If a new version was created, navigate to the new quiz
            if (response.data.quiz.isNewVersion) {
                navigate(`/professor/quizzes/${response.data.quiz.id}`);
            } else {
                navigate(`/professor/quizzes/${quizId}`);
            }
            
        } catch (err) {
            console.error('Error updating quiz:', err);
            setError(err.response?.data?.message || 'Failed to update quiz');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading quiz data...</p>
                    <small className="text-muted">Quiz ID: {quizId}</small>
                </div>
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Quiz not found or you don't have permission to edit it.
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="row">
                <div className="col-lg-8 mx-auto">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2>
                            <i className="fas fa-edit me-2"></i>
                            Edit Quiz: {quiz.title}
                        </h2>
                        <button 
                            className="btn btn-outline-secondary"
                            onClick={() => navigate(-1)}
                        >
                            <i className="fas fa-arrow-left me-1"></i>
                            Back
                        </button>
                    </div>

                    {/* Edit Warning/Info */}
                    {canEdit !== null && (
                        <div className={`alert ${canEdit ? 'alert-info' : 'alert-warning'}`}>
                            <i className={`fas ${canEdit ? 'fa-info-circle' : 'fa-exclamation-triangle'} me-2`}></i>
                            <strong>{canEdit ? 'Direct Edit Mode:' : 'Version Control Mode:'}</strong> {editWarning}
                        </div>
                    )}

                    {error && (
                        <div className="alert alert-danger alert-dismissible fade show">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            {error}
                            <button type="button" className="btn-close" onClick={() => setError('')}></button>
                        </div>
                    )}

                    {/* DEBUG: Show current form data (remove in production) */}
                    {process.env.NODE_ENV === 'development' && formData && (
                        <div className="alert alert-info">
                            <strong>🐛 Debug Info:</strong><br/>
                            <small>
                                <strong>Quiz Title:</strong> "{formData.title}"<br/>
                                <strong>Questions loaded:</strong> {formData.questions.length}<br/>
                                <strong>Time limit:</strong> {formData.time_limit_minutes} minutes<br/>
                                <strong>Description:</strong> "{formData.description}"<br/>
                                <hr className="my-2"/>
                                <strong>Questions Detail:</strong><br/>
                                {formData.questions.map((q, idx) => (
                                    <div key={idx} style={{ marginLeft: '10px', fontSize: '11px' }}>
                                        <strong>Q{idx + 1}:</strong> "{q.question_text || '[EMPTY]'}" 
                                        <span className="text-muted"> (ID: {q.id}, Points: {q.points})</span><br/>
                                        <span className="text-muted" style={{ marginLeft: '20px' }}>
                                            Options: {q.options.map(opt => `"${opt.option_text}"${opt.is_correct ? ' ✓' : ''}`).join(', ')}
                                        </span><br/>
                                    </div>
                                ))}
                            </small>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Basic Quiz Info */}
                        <div className="card mb-4">
                            <div className="card-header bg-primary text-white">
                                <h5 className="mb-0">
                                    <i className="fas fa-info-circle me-2"></i>
                                    Quiz Information
                                </h5>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-md-8 mb-3">
                                        <label htmlFor="title" className="form-label">Quiz Title *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="title"
                                            value={formData.title}
                                            onChange={(e) => handleFormChange('title', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                        <label htmlFor="timeLimit" className="form-label">Time Limit (minutes)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            id="timeLimit"
                                            min="1"
                                            value={formData.time_limit_minutes}
                                            onChange={(e) => handleFormChange('time_limit_minutes', parseInt(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="description" className="form-label">Description</label>
                                    <textarea
                                        className="form-control"
                                        id="description"
                                        rows="3"
                                        value={formData.description}
                                        onChange={(e) => handleFormChange('description', e.target.value)}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="deadline" className="form-label">Deadline</label>
                                    <input
                                        type="datetime-local"
                                        className="form-control"
                                        id="deadline"
                                        value={formData.deadline}
                                        onChange={(e) => handleFormChange('deadline', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Questions Section */}
                        <div className="card mb-4">
                            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">
                                    <i className="fas fa-question-circle me-2"></i>
                                    Questions ({formData.questions.length})
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn btn-light btn-sm"
                                    onClick={addQuestion}
                                >
                                    <i className="fas fa-plus me-1"></i>
                                    Add Question
                                </button>
                            </div>
                            <div className="card-body">
                                {formData.questions.length === 0 ? (
                                    <div className="text-center py-4">
                                        <i className="fas fa-question-circle fa-3x text-muted mb-3"></i>
                                        <h6 className="text-muted">No questions yet</h6>
                                        <p className="text-muted">Click "Add Question" to start building your quiz</p>
                                    </div>
                                ) : (
                                    formData.questions.map((question, qIdx) => (
                                        <div key={qIdx} className="border rounded p-3 mb-3">
                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                <h6 className="text-primary">Question {qIdx + 1}</h6>
                                                <button 
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm"
                                                    onClick={() => removeQuestion(qIdx)}
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>

                                            <div className="row mb-3">
                                                <div className="col-md-8">
                                                    <label className="form-label">Question Text *</label>
                                                    <textarea
                                                        className="form-control"
                                                        rows="3"
                                                        placeholder={`Enter question ${qIdx + 1} text here...`}
                                                        value={question.question_text || ''}
                                                        onChange={(e) => {
                                                            console.log(`📝 Question text changed for Q${qIdx + 1}:`, e.target.value);
                                                            handleQuestionChange(qIdx, 'question_text', e.target.value);
                                                        }}
                                                        required
                                                        style={{ backgroundColor: (question.question_text || '').trim() ? '#fff' : '#fff3cd' }}
                                                    />
                                                    <small className="text-muted">
                                                        Current value: "{question.question_text || '[EMPTY]'}"
                                                    </small>
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">Points</label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        min="1"
                                                        value={question.points || 1}
                                                        onChange={(e) => {
                                                            console.log(`🎯 Points changed for Q${qIdx + 1}:`, e.target.value);
                                                            handleQuestionChange(qIdx, 'points', parseInt(e.target.value));
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <label className="form-label mb-0">Answer Options *</label>
                                                    <button 
                                                        type="button"
                                                        className="btn btn-outline-success btn-sm"
                                                        onClick={() => addOption(qIdx)}
                                                    >
                                                        <i className="fas fa-plus me-1"></i>
                                                        Add Option
                                                    </button>
                                                </div>

                                                {question.options.map((option, oIdx) => (
                                                    <div key={`${qIdx}-${oIdx}`} className="input-group mb-2">
                                                        <div className="input-group-text">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(option.is_correct)}
                                                                onChange={(e) => {
                                                                    console.log(`🔲 Checkbox changed for Q${qIdx + 1} O${oIdx + 1}:`, e.target.checked);
                                                                    handleOptionChange(qIdx, oIdx, 'is_correct', e.target.checked);
                                                                }}
                                                                title="Mark as correct answer"
                                                            />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder={`Option ${oIdx + 1}`}
                                                            value={option.option_text || ''}
                                                            onChange={(e) => {
                                                                console.log(`✏️  Option text changed for Q${qIdx + 1} O${oIdx + 1}:`, e.target.value);
                                                                handleOptionChange(qIdx, oIdx, 'option_text', e.target.value);
                                                            }}
                                                            required
                                                        />
                                                        {question.options.length > 2 && (
                                                            <button 
                                                                type="button"
                                                                className="btn btn-outline-danger"
                                                                onClick={() => removeOption(qIdx, oIdx)}
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <small className="text-muted">
                                                    <i className="fas fa-info-circle me-1"></i>
                                                    Check the box next to correct answers
                                                </small>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="d-flex justify-content-end gap-2">
                            <button 
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => navigate(-1)}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving || formData.questions.length === 0}
                            >
                                {saving ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-save me-2"></i>
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditQuiz;
