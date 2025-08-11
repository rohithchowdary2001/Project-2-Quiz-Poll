import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import api from "../../services/api";
import socket from "../../services/socket";

const QuizManagement = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [targetClassId, setTargetClassId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiForm, setAiForm] = useState({
    topic: "",
    numQuestions: 5,
    difficulty: "medium"
  });
  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    classId: "",
    deadline: "",
    questionTimeLimit: 30, // Single time limit for ALL questions
    questions: [
      {
        questionText: "",
        questionType: "single_choice",
        points: 1,
        options: [
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ],
      },
    ],
  });

  useEffect(() => {
    // Setup socket connection for professor
    socket.on('connect', () => {
      socket.emit('join_professor_room', user.id);
    });

    socket.on("quizResultsUpdated", (data) => {
      if (quizzes.some((q) => String(q.id) === String(data.quizId))) {
        fetchQuizzes();
      }
    });
    
    return () => {
      socket.off("quizResultsUpdated");
    };
  }, [quizzes]);

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
      setLoading(true);
      const params = selectedClassId
        ? `?classId=${selectedClassId}&sortBy=created_at&sortOrder=DESC`
        : "?sortBy=created_at&sortOrder=DESC";
      const response = await api.get(`/quizzes${params}`);
      setQuizzes(response.data.quizzes || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch quizzes");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get("/classes");
      setClasses(response.data.classes || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch classes");
    }
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    try {
      if (!quizForm.title || !quizForm.classId) {
        setError("Title and class are required");
        return;
      }
      if (quizForm.questions.length === 0) {
        setError("At least one question is required");
        return;
      }
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
        if (!question.options.some((opt) => opt.isCorrect)) {
          setError(`Question ${i + 1} must have at least one correct answer`);
          return;
        }
      }
      
      if (!quizForm.questionTimeLimit || quizForm.questionTimeLimit < 5) {
        setError(`Question time limit must be at least 5 seconds`);
        return;
      }
      const response = await api.post("/quizzes", {
        title: quizForm.title,
        description: quizForm.description,
        classId: quizForm.classId,
        deadline: quizForm.deadline || null,
        questionTimeLimit: quizForm.questionTimeLimit,
        questions: quizForm.questions,
      });
      setShowCreateModal(false);
      resetQuizForm();
      fetchQuizzes();
      alert("Quiz created successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create quiz");
    }
  };

  const handleDeleteQuiz = async (quizId, quizTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${quizTitle}"?`)) {
      return;
    }
    try {
      await api.delete(`/quizzes/${quizId}`);
      fetchQuizzes();
      alert("Quiz deleted successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete quiz");
    }
  };

  const handleCopyQuiz = async () => {
    if (!selectedQuiz || !targetClassId) return;
    try {
      await api.post(`/quizzes/${selectedQuiz.id}/copy`, { targetClassId });
      setShowCopyModal(false);
      setTargetClassId("");
      setSelectedQuiz(null);
      fetchQuizzes();
      alert("Quiz copied successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to copy quiz");
    }
  };

  const handleToggleQuizLiveActive = async (quizId, currentStatus) => {
    try {
      // Calculate new status - handle both boolean and numeric values
      const isCurrentlyActive = Boolean(currentStatus);
      const newStatus = !isCurrentlyActive;
      
      console.log(`🔄 PURE FRONTEND: Live toggling quiz ${quizId}`);
      console.log(`📊 Current status: ${currentStatus} → New status: ${newStatus}`);
      
      // Get quiz details for socket broadcast
      const quiz = quizzes.find(q => q.id === quizId);
      if (!quiz) {
        setError('Quiz not found');
        return;
      }

      // 🔍 DEBUG: Check class ID details
      console.log(`🔍 PROFESSOR DEBUG: Quiz details:`, {
        id: quiz.id,
        title: quiz.title,
        class_id: quiz.class_id,
        class_name: quiz.class_name
      });
      console.log(`🔍 PROFESSOR DEBUG: Broadcasting to class_${quiz.class_id}`);
      console.log(`🔍 PROFESSOR DEBUG: Student should be in class room ${quiz.class_id} to receive this`);

      // Update the quiz in local state immediately (Pure Frontend!)
      setQuizzes(prev => prev.map(q => 
        q.id === quizId 
          ? { ...q, is_live_active: newStatus }
          : q
      ));

      // Broadcast via socket to students (NO API CALLS!)
      socket.emit('quiz_live_status_change', {
        quizId: quizId,
        quizTitle: quiz.title,
        classId: quiz.class_id,
        isLiveActive: newStatus,
        professorId: user.id,
        professorName: user.full_name || user.email,
        timestamp: Date.now()
      });

      console.log(`📡 SOCKET-ONLY: Quiz ${quizId} ${newStatus ? 'activated' : 'deactivated'} via socket broadcast`);
      console.log(`� NO DATABASE CALLS - Pure frontend socket communication!`);
      
    } catch (err) {
      console.error('❌ Failed to toggle quiz status:', err);
      setError(err.message || 'Failed to update quiz status');
    }
  };

  const handleGenerateAI = async (e) => {
    e.preventDefault();
    try {
      setAiGenerating(true);
      setError("");

      if (!aiForm.topic.trim()) {
        setError("Please enter a topic for AI generation");
        return;
      }

      const response = await api.post("/quizzes/generate-ai", {
        topic: aiForm.topic,
        numQuestions: aiForm.numQuestions,
        difficulty: aiForm.difficulty
      });

      // Add generated questions to the quiz form
      setQuizForm({
        ...quizForm,
        questions: response.data.questions
      });

      setShowAIModal(false);
      setShowCreateModal(true);
      setAiForm({ topic: "", numQuestions: 5, difficulty: "medium" });
      
      alert(`Successfully generated ${response.data.questions.length} questions about "${response.data.metadata.topic}"!`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate AI questions");
    } finally {
      setAiGenerating(false);
    }
  };

  const addQuestion = () => {
    setQuizForm({
      ...quizForm,
      questions: [
        ...quizForm.questions,
        {
          questionText: "",
          questionType: "single_choice",
          points: 1,
          options: [
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
          ],
        },
      ],
    });
  };

  const removeQuestion = (questionIndex) => {
    const newQuestions = quizForm.questions.filter(
      (_, index) => index !== questionIndex
    );
    setQuizForm({ ...quizForm, questions: newQuestions });
  };

  const updateQuestion = (questionIndex, field, value) => {
    const newQuestions = [...quizForm.questions];
    newQuestions[questionIndex][field] = value;
    setQuizForm({ ...quizForm, questions: newQuestions });
  };

  const addOption = (questionIndex) => {
    const newQuestions = [...quizForm.questions];
    newQuestions[questionIndex].options.push({ text: "", isCorrect: false });
    setQuizForm({ ...quizForm, questions: newQuestions });
  };

  const removeOption = (questionIndex, optionIndex) => {
    const newQuestions = [...quizForm.questions];
    newQuestions[questionIndex].options = newQuestions[
      questionIndex
    ].options.filter((_, index) => index !== optionIndex);
    setQuizForm({ ...quizForm, questions: newQuestions });
  };

  const updateOption = (questionIndex, optionIndex, field, value) => {
    const newQuestions = [...quizForm.questions];
    newQuestions[questionIndex].options[optionIndex][field] = value;
    setQuizForm({ ...quizForm, questions: newQuestions });
  };

  const resetQuizForm = () => {
    setQuizForm({
      title: "",
      description: "",
      classId: "",
      deadline: "",
      questionTimeLimit: 30,
      questions: [
        {
          questionText: "",
          questionType: "single_choice",
          points: 1,
          options: [
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
          ],
        },
      ],
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No deadline";
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (quiz) => {
    if (quiz.is_live_active) {
      return (
        <span className="badge bg-success">
          <i className="fas fa-play me-1"></i>
          Active
        </span>
      );
    } else {
      return (
        <span className="badge bg-warning text-dark">
          <i className="fas fa-pause me-1"></i>
          Paused
        </span>
      );
    }
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
          <button
            className="btn btn-info me-2"
            onClick={() => setShowAIModal(true)}
            title="Generate quiz questions using AI"
          >
            <i className="fas fa-robot me-2"></i>
            AI Generate
          </button>
          <button
            className="btn btn-success me-2"
            onClick={() => setShowCreateModal(true)}
          >
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
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.class_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div
          className="alert alert-danger alert-dismissible fade show"
          role="alert"
        >
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
          ></button>
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
                  {quizzes.map((quiz) => (
                    <tr key={quiz.id}>
                      <td>
                        <div className="fw-bold d-flex align-items-center">
                          {quiz.title}
                          {/* COPY BUTTON */}
                          <button
                            className="btn btn-sm btn-outline-warning ms-2"
                            title="Copy Quiz"
                            onClick={() => {
                              setSelectedQuiz(quiz);
                              setShowCopyModal(true);
                            }}
                          >
                            <i className="fas fa-copy me-1"></i>
                            Copy
                          </button>
                        </div>
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
                      <td>
                        <div className="d-flex align-items-center justify-content-between">
                          {getStatusBadge(quiz)}
                          <button
                            className={`btn btn-sm ms-2 ${
                              Boolean(quiz.is_live_active) 
                                ? 'btn-outline-warning' 
                                : 'btn-outline-success'
                            }`}
                            onClick={() => handleToggleQuizLiveActive(quiz.id, quiz.is_live_active)}
                            title={`Socket-Only: Click to ${Boolean(quiz.is_live_active) ? 'pause' : 'activate'} quiz for students (No Database!)`}
                          >
                            <i className={`fas ${
                              Boolean(quiz.is_live_active) 
                                ? 'fa-pause' 
                                : 'fa-play'
                            } me-1`}></i>
                            {Boolean(quiz.is_live_active) ? 'Pause' : 'Activate'}
                            <small className="ms-1" title="Socket-only, no database">⚡</small>
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <Link
                            to={`/professor/quiz-results/${quiz.id}`}
                            className="btn btn-sm btn-outline-primary"
                          >
                            <i className="fas fa-chart-bar me-1"></i>
                            Results
                          </Link>
                          <Link
                            to={`/professor/edit-quiz/${quiz.id}`}
                            className="btn btn-sm btn-outline-secondary"
                            title="Edit Quiz"
                          >
                            <i className="fas fa-edit me-1"></i>
                            Edit
                          </Link>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              handleDeleteQuiz(quiz.id, quiz.title)
                            }
                          >
                            <i className="fas fa-trash me-1"></i>
                            Delete
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
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Quiz</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateQuiz}>
                <div
                  className="modal-body"
                  style={{ maxHeight: "70vh", overflowY: "auto" }}
                >
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
                          onChange={(e) =>
                            setQuizForm({ ...quizForm, title: e.target.value })
                          }
                          required
                          placeholder="Enter quiz title"
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Class</label>
                        <select
                          className="form-select"
                          value={quizForm.classId}
                          onChange={(e) =>
                            setQuizForm({
                              ...quizForm,
                              classId: e.target.value,
                            })
                          }
                          required
                        >
                          <option value="">Select a class</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name} ({cls.class_code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Deadline (Optional)
                        </label>
                        <input
                          type="datetime-local"
                          className="form-control"
                          value={quizForm.deadline}
                          onChange={(e) =>
                            setQuizForm({
                              ...quizForm,
                              deadline: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Question Time Limit (seconds)
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={quizForm.questionTimeLimit}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = value === '' ? 30 : parseInt(value);
                            setQuizForm({
                              ...quizForm,
                              questionTimeLimit: isNaN(numValue) ? 30 : numValue,
                            });
                          }}
                          min="5"
                          max="300"
                          placeholder="Time per question in seconds"
                        />
                        <small className="text-muted">
                          This time limit will apply to ALL questions
                        </small>
                      </div>
                      <div className="col-12 mb-3">
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          value={quizForm.description}
                          onChange={(e) =>
                            setQuizForm({
                              ...quizForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="Enter quiz description (optional)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6>Questions</h6>
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={addQuestion}
                      >
                        <i className="fas fa-plus me-1"></i>
                        Add Question
                      </button>
                    </div>

                    {quizForm.questions.map((question, questionIndex) => (
                      <div key={questionIndex} className="card mb-3">
                        <div className="card-header">
                          <div className="d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">
                              Question {questionIndex + 1}
                            </h6>
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
                              <label className="form-label">
                                Question Text
                              </label>
                              <textarea
                                className="form-control"
                                rows="2"
                                value={question.questionText}
                                onChange={(e) =>
                                  updateQuestion(
                                    questionIndex,
                                    "questionText",
                                    e.target.value
                                  )
                                }
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
                                onChange={(e) =>
                                  updateQuestion(
                                    questionIndex,
                                    "points",
                                    parseInt(e.target.value)
                                  )
                                }
                                min="1"
                                max="10"
                              />
                            </div>
                          </div>

                          <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <label className="form-label">
                                Answer Options
                              </label>
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
                              <div
                                key={optionIndex}
                                className="input-group mb-2"
                              >
                                <div className="input-group-text">
                                  <input
                                    type="checkbox"
                                    checked={option.isCorrect}
                                    onChange={(e) =>
                                      updateOption(
                                        questionIndex,
                                        optionIndex,
                                        "isCorrect",
                                        e.target.checked
                                      )
                                    }
                                    title="Mark as correct answer"
                                  />
                                </div>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={option.text}
                                  onChange={(e) =>
                                    updateOption(
                                      questionIndex,
                                      optionIndex,
                                      "text",
                                      e.target.value
                                    )
                                  }
                                  placeholder={`Option ${optionIndex + 1}`}
                                  required
                                />
                                {question.options.length > 2 && (
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() =>
                                      removeOption(questionIndex, optionIndex)
                                    }
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
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
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

      {/* Copy Quiz Modal */}
      {showCopyModal && selectedQuiz && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Copy Quiz - {selectedQuiz.title}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCopyModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <label>Select target class:</label>
                <select
                  className="form-select"
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                >
                  <option value="">Select a class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.class_code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCopyModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCopyQuiz}
                  disabled={!targetClassId}
                >
                  Copy Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Generation Modal */}
      {showAIModal && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-robot me-2"></i>
                  AI Quiz Generation
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAIModal(false)}
                ></button>
              </div>
              <form onSubmit={handleGenerateAI}>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    <strong>AI Quiz Generator:</strong> Enter a topic and let AI create quiz questions for you automatically!
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      <i className="fas fa-lightbulb me-2"></i>
                      Topic
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={aiForm.topic}
                      onChange={(e) =>
                        setAiForm({ ...aiForm, topic: e.target.value })
                      }
                      placeholder="e.g., JavaScript fundamentals, World History, Biology..."
                      required
                    />
                    <small className="text-muted">
                      Be specific for better results (e.g., "React Hooks" instead of just "React")
                    </small>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        <i className="fas fa-list-ol me-2"></i>
                        Number of Questions
                      </label>
                      <select
                        className="form-select"
                        value={aiForm.numQuestions}
                        onChange={(e) =>
                          setAiForm({
                            ...aiForm,
                            numQuestions: parseInt(e.target.value),
                          })
                        }
                      >
                        <option value={3}>3 Questions</option>
                        <option value={5}>5 Questions</option>
                        <option value={10}>10 Questions</option>
                        <option value={15}>15 Questions</option>
                        <option value={20}>20 Questions</option>
                      </select>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        <i className="fas fa-chart-line me-2"></i>
                        Difficulty Level
                      </label>
                      <select
                        className="form-select"
                        value={aiForm.difficulty}
                        onChange={(e) =>
                          setAiForm({ ...aiForm, difficulty: e.target.value })
                        }
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    <strong>Note:</strong> AI-generated questions will replace any existing questions in your quiz form. Review and edit them before saving.
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAIModal(false)}
                    disabled={aiGenerating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-info"
                    disabled={aiGenerating || !aiForm.topic.trim()}
                  >
                    {aiGenerating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Generating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-magic me-2"></i>
                        Generate Questions
                      </>
                    )}
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
