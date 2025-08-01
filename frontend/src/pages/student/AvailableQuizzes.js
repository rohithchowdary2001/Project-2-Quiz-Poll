import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AvailableQuizzes = () => {
  const [filter, setFilter] = useState('available');
  const navigate = useNavigate();

  const { data: quizzes, isLoading, error } = useQuery(
    ['student-quizzes', filter],
    () => api.get(`/quizzes?status=${filter}`),
    {
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  );

  const getStatusBadge = (quiz) => {
    const now = new Date();
    const startDate = new Date(quiz.start_date);
    const endDate = new Date(quiz.end_date);
    
    if (now < startDate) return <span className="badge bg-warning">Upcoming</span>;
    if (now > endDate) return <span className="badge bg-danger">Expired</span>;
    if (quiz.user_submitted) return <span className="badge bg-success">Completed</span>;
    return <span className="badge bg-primary">Available</span>;
  };

  const canTakeQuiz = (quiz) => {
    const now = new Date();
    const startDate = new Date(quiz.start_date);
    const endDate = new Date(quiz.end_date);
    
    return now >= startDate && now <= endDate && !quiz.user_submitted;
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="alert alert-danger">Error loading quizzes</div>;

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <h1>Available Quizzes</h1>
          
          <div className="mb-4">
            <div className="btn-group" role="group">
              <button
                className={`btn ${filter === 'available' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('available')}
              >
                Available
              </button>
              <button
                className={`btn ${filter === 'upcoming' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('upcoming')}
              >
                Upcoming
              </button>
              <button
                className={`btn ${filter === 'completed' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('completed')}
              >
                Completed
              </button>
            </div>
          </div>

          <div className="row">
            {quizzes?.map((quiz) => (
              <div key={quiz.id} className="col-md-6 col-lg-4 mb-4">
                <div className="card h-100">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">{quiz.title}</h5>
                    {getStatusBadge(quiz)}
                  </div>
                  <div className="card-body">
                    <p className="text-muted mb-2">{quiz.class_name}</p>
                    {quiz.description && (
                      <p className="card-text">{quiz.description}</p>
                    )}
                    <div className="row text-center">
                      <div className="col-6">
                        <small className="text-muted">Duration</small>
                        <div><strong>{quiz.duration} min</strong></div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Questions</small>
                        <div><strong>{quiz.questions_count}</strong></div>
                      </div>
                    </div>
                    <hr />
                    <div className="mb-2">
                      <small className="text-muted">Start: </small>
                      <small>{new Date(quiz.start_date).toLocaleString()}</small>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted">End: </small>
                      <small>{new Date(quiz.end_date).toLocaleString()}</small>
                    </div>
                    
                    {quiz.user_submitted && (
                      <div className="alert alert-success py-2">
                        <small>
                          <i className="bi bi-check-circle me-1"></i>
                          Submitted on {new Date(quiz.submitted_at).toLocaleString()}
                        </small>
                      </div>
                    )}
                  </div>
                  <div className="card-footer">
                    {canTakeQuiz(quiz) ? (
                      <button
                        className="btn btn-primary w-100"
                        onClick={() => navigate(`/student/quizzes/${quiz.id}/take`)}
                      >
                        <i className="bi bi-play-circle me-2"></i>
                        Take Quiz
                      </button>
                    ) : quiz.user_submitted ? (
                      <button
                        className="btn btn-outline-info w-100"
                        onClick={() => navigate(`/student/history`)}
                      >
                        <i className="bi bi-eye me-2"></i>
                        View Results
                      </button>
                    ) : (
                      <button className="btn btn-secondary w-100" disabled>
                        Not Available
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(!quizzes || quizzes.length === 0) && (
            <div className="text-center py-5">
              <i className="bi bi-journal-text display-1 text-muted"></i>
              <h3 className="mt-3">No quizzes found</h3>
              <p className="text-muted">
                {filter === 'available' 
                  ? 'No quizzes are currently available' 
                  : `No ${filter} quizzes found`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvailableQuizzes; 