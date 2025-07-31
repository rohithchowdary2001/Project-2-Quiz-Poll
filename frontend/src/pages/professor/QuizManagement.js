import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const QuizManagement = () => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showCopyModal, setShowCopyModal] = useState(false); // <-- NEW STATE
  const [targetClassId, setTargetClassId] = useState("");    // <-- NEW STATE
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch quizzes
  const { data: quizzes, isLoading, error } = useQuery(
    'professor-quizzes',
    () => api.get('/quizzes'),
    {
      onError: (error) => {
        toast.error('Failed to fetch quizzes');
      }
    }
  );

  // Fetch classes for copy modal
  const { data: classes } = useQuery(
    'professor-classes',
    () => api.get('/classes'),
    { staleTime: 60000 }
  );

  // Copy quiz mutation
  const copyQuizMutation = useMutation(
    ({ quizId, targetClassId }) => api.post(`/quizzes/${quizId}/copy`, { targetClassId }),
    {
      onSuccess: () => {
        toast.success('Quiz copied successfully');
        setShowCopyModal(false);
        setTargetClassId("");
        queryClient.invalidateQueries('professor-quizzes');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to copy quiz');
      }
    }
  );

  // Delete quiz mutation
  const deleteQuizMutation = useMutation(
    (quizId) => api.delete(`/quizzes/${quizId}`),
    {
      onSuccess: () => {
        toast.success('Quiz deleted successfully');
        queryClient.invalidateQueries('professor-quizzes');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete quiz');
      }
    }
  );

  // Toggle quiz status mutation
  const toggleQuizMutation = useMutation(
    ({ quizId, isActive }) => api.patch(`/quizzes/${quizId}`, { is_active: isActive }),
    {
      onSuccess: () => {
        toast.success('Quiz status updated successfully');
        queryClient.invalidateQueries('professor-quizzes');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update quiz status');
      }
    }
  );

  const handleDeleteQuiz = (quizId) => {
    if (window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      deleteQuizMutation.mutate(quizId);
    }
  };

  const handleToggleQuiz = (quiz) => {
    toggleQuizMutation.mutate({ quizId: quiz.id, isActive: !quiz.is_active });
  };

  const handleCopyQuiz = () => {
    if (!targetClassId) {
      toast.error("Please select a class to copy to.");
      return;
    }
    copyQuizMutation.mutate({ quizId: selectedQuiz.id, targetClassId });
  };

  const getStatusBadge = (quiz) => {
    if (!quiz.is_active) return <span className="badge bg-secondary">Inactive</span>;
    const now = new Date();
    const startDate = new Date(quiz.start_date);
    const endDate = new Date(quiz.end_date);
    if (now < startDate) return <span className="badge bg-warning">Scheduled</span>;
    if (now > endDate) return <span className="badge bg-danger">Expired</span>;
    return <span className="badge bg-success">Active</span>;
  };

  const getFilteredQuizzes = () => {
    if (!quizzes) return [];
    switch (filter) {
      case 'active':
        return quizzes.filter(quiz => quiz.is_active);
      case 'inactive':
        return quizzes.filter(quiz => !quiz.is_active);
      case 'expired':
        return quizzes.filter(quiz => new Date() > new Date(quiz.end_date));
      default:
        return quizzes;
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="alert alert-danger">Error loading quizzes</div>;

  const filteredQuizzes = getFilteredQuizzes();

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Quiz Management</h1>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/professor/quizzes/create')}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Create New Quiz
            </button>
          </div>

          {/* Filters */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="btn-group" role="group">
                <button
                  className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setFilter('all')}
                >
                  All ({quizzes?.length || 0})
                </button>
                <button
                  className={`btn ${filter === 'active' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setFilter('active')}
                >
                  Active ({quizzes?.filter(q => q.is_active).length || 0})
                </button>
                <button
                  className={`btn ${filter === 'inactive' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setFilter('inactive')}
                >
                  Inactive ({quizzes?.filter(q => !q.is_active).length || 0})
                </button>
                <button
                  className={`btn ${filter === 'expired' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setFilter('expired')}
                >
                  Expired ({quizzes?.filter(q => new Date() > new Date(q.end_date)).length || 0})
                </button>
              </div>
            </div>
          </div>

          {/* Quizzes Table */}
          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Class</th>
                      <th>Questions</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                      <th>Submissions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuizzes.map((quiz) => (
                      <tr key={quiz.id}>
                        <td>
                          <strong>{quiz.title}</strong>
                          <br />
                          <small className="text-muted">{quiz.quiz_type}</small>
                        </td>
                        <td>{quiz.class_name}</td>
                        <td>{quiz.questions_count || 0}</td>
                        <td>
                          {new Date(quiz.start_date).toLocaleDateString()}
                          <br />
                          <small className="text-muted">
                            {new Date(quiz.start_date).toLocaleTimeString()}
                          </small>
                        </td>
                        <td>
                          {new Date(quiz.end_date).toLocaleDateString()}
                          <br />
                          <small className="text-muted">
                            {new Date(quiz.end_date).toLocaleTimeString()}
                          </small>
                        </td>
                        <td>{getStatusBadge(quiz)}</td>
                        <td>
                          <span className="badge bg-info">
                            {quiz.submissions_count || 0}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => {
                                setSelectedQuiz(quiz);
                                setShowPreviewModal(true);
                              }}
                              title="Preview"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => navigate(`/professor/quizzes/${quiz.id}/edit`)}
                              title="Edit"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-info"
                              onClick={() => navigate(`/professor/quizzes/${quiz.id}/results`)}
                              title="View Results"
                            >
                              <i className="bi bi-bar-chart"></i>
                            </button>
                            <button
                              className={`btn btn-sm ${quiz.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                              onClick={() => handleToggleQuiz(quiz)}
                              title={quiz.is_active ? 'Deactivate' : 'Activate'}
                            >
                              <i className={`bi ${quiz.is_active ? 'bi-pause' : 'bi-play'}`}></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              title="Delete"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => {
                                setSelectedQuiz(quiz);
                                setShowCopyModal(true);
                              }}
                              title="Copy Quiz"
                            >
                              <i className="bi bi-files"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredQuizzes.length === 0 && (
                <div className="text-center py-5">
                  <i className="bi bi-journal-text display-1 text-muted"></i>
                  <h3 className="mt-3">No quizzes found</h3>
                  <p className="text-muted">
                    {filter === 'all' 
                      ? 'Create your first quiz to get started' 
                      : `No ${filter} quizzes available`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && selectedQuiz && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Quiz Preview - {selectedQuiz.title}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPreviewModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Basic Information</h6>
                    <p><strong>Class:</strong> {selectedQuiz.class_name}</p>
                    <p><strong>Type:</strong> {selectedQuiz.quiz_type}</p>
                    <p><strong>Duration:</strong> {selectedQuiz.duration} minutes</p>
                    <p><strong>Max Attempts:</strong> {selectedQuiz.max_attempts}</p>
                  </div>
                  <div className="col-md-6">
                    <h6>Schedule</h6>
                    <p><strong>Start:</strong> {new Date(selectedQuiz.start_date).toLocaleString()}</p>
                    <p><strong>End:</strong> {new Date(selectedQuiz.end_date).toLocaleString()}</p>
                    <p><strong>Status:</strong> {getStatusBadge(selectedQuiz)}</p>
                  </div>
                </div>
                {selectedQuiz.description && (
                  <div className="mt-3">
                    <h6>Description</h6>
                    <p>{selectedQuiz.description}</p>
                  </div>
                )}
                {selectedQuiz.instructions && (
                  <div className="mt-3">
                    <h6>Instructions</h6>
                    <p>{selectedQuiz.instructions}</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPreviewModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    navigate(`/professor/quizzes/${selectedQuiz.id}/edit`);
                    setShowPreviewModal(false);
                  }}
                >
                  Edit Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COPY MODAL */}
      {showCopyModal && selectedQuiz && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Copy Quiz - {selectedQuiz.title}</h5>
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
                  onChange={e => setTargetClassId(e.target.value)}
                >
                  <option value="">Select a class</option>
                  {classes?.map(cls => (
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
                  disabled={!targetClassId || copyQuizMutation.isLoading}
                >
                  {copyQuizMutation.isLoading ? "Copying..." : "Copy Quiz"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

     {/* Modal Backdrop */}
      {(showPreviewModal || showCopyModal) && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
};

export default QuizManagement;