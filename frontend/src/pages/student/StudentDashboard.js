import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, endpoints } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, quizzesResponse, submissionsResponse] = await Promise.all([
        api.get(endpoints.users.stats),
        api.get(`${endpoints.quizzes.list}?limit=5&status=active`),
        api.get(`${endpoints.submissions.mySubmissions}?limit=5`)
      ]);
      
      setStats(statsResponse.data);
      setAvailableQuizzes(quizzesResponse.data.quizzes || []);
      setRecentSubmissions(submissionsResponse.data.submissions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  const quickActions = [
    {
      title: 'Available Quizzes',
      description: 'View and take available quizzes',
      icon: 'bi-list-check',
      link: '/student/quizzes',
      color: 'primary',
      count: availableQuizzes.length
    },
    {
      title: 'Quiz History',
      description: 'View your quiz results and performance',
      icon: 'bi-clock-history',
      link: '/student/history',
      color: 'info',
      count: recentSubmissions.length
    }
  ];

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-0">Welcome back, {user?.name}!</h1>
              <p className="text-muted">Here's your quiz performance overview</p>
            </div>
            <div className="text-muted">
              <i className="bi bi-calendar me-1"></i>
              {new Date().toLocaleDateString()}
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="row mb-4">
            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-primary shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Quizzes Taken
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {stats?.totalQuizzes || 0}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-clipboard-check text-primary" style={{ fontSize: '2rem' }}></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-success shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                        Average Score
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {stats?.averageScore || 0}%
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-trophy text-success" style={{ fontSize: '2rem' }}></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-info shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                        Available Quizzes
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {availableQuizzes.length}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-question-circle text-info" style={{ fontSize: '2rem' }}></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-warning shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                        Best Score
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {stats?.bestScore || 0}%
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-star text-warning" style={{ fontSize: '2rem' }}></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="row mb-4">
            <div className="col-12">
              <h4 className="mb-3">Quick Actions</h4>
              <div className="row">
                {quickActions.map((action, index) => (
                  <div key={index} className="col-md-6 mb-3">
                    <Link 
                      to={action.link} 
                      className="card text-decoration-none h-100 shadow-sm"
                      style={{ transition: 'transform 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div className="card-body text-center">
                        <i className={`${action.icon} text-${action.color} mb-3`} style={{ fontSize: '3rem' }}></i>
                        <h5 className="card-title">{action.title}</h5>
                        <p className="card-text text-muted">{action.description}</p>
                        {action.count > 0 && (
                          <span className={`badge bg-${action.color} fs-6`}>
                            {action.count} {action.count === 1 ? 'item' : 'items'}
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="row">
            <div className="col-lg-8">
              <div className="card shadow mb-4">
                <div className="card-header py-3 d-flex justify-content-between align-items-center">
                  <h6 className="m-0 font-weight-bold text-primary">Available Quizzes</h6>
                  <Link to="/student/quizzes" className="btn btn-sm btn-outline-primary">
                    View All
                  </Link>
                </div>
                <div className="card-body">
                  {availableQuizzes.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Quiz Title</th>
                            <th>Class</th>
                            <th>Due Date</th>
                            <th>Time Limit</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {availableQuizzes.map((quiz) => (
                            <tr key={quiz.id}>
                              <td>
                                <div className="fw-bold">{quiz.title}</div>
                                <small className="text-muted">{quiz.description}</small>
                              </td>
                              <td>{quiz.className}</td>
                              <td>
                                {quiz.dueDate ? (
                                  <span className={`badge ${new Date(quiz.dueDate) < new Date() ? 'bg-danger' : 'bg-success'}`}>
                                    {new Date(quiz.dueDate).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span className="text-muted">No due date</span>
                                )}
                              </td>
                              <td>
                                {quiz.timeLimit ? `${quiz.timeLimit} minutes` : 'No limit'}
                              </td>
                              <td>
                                <Link 
                                  to={`/student/quizzes/${quiz.id}/take`}
                                  className="btn btn-sm btn-primary"
                                >
                                  Take Quiz
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <i className="bi bi-clipboard-x text-muted mb-3" style={{ fontSize: '3rem' }}></i>
                      <p className="text-muted">No quizzes available at the moment</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card shadow mb-4">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">Performance Overview</h6>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-sm">Overall Performance</span>
                      <span className="fw-bold">{stats?.averageScore || 0}%</span>
                    </div>
                    <div className="progress">
                      <div 
                        className="progress-bar bg-success" 
                        style={{ width: `${stats?.averageScore || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-center mt-4">
                    <Link to="/student/history" className="btn btn-outline-primary btn-sm">
                      View Detailed History
                    </Link>
                  </div>
                </div>
              </div>

              <div className="card shadow mb-4">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">Recent Submissions</h6>
                </div>
                <div className="card-body">
                  {recentSubmissions.length > 0 ? (
                    <div className="list-group list-group-flush">
                      {recentSubmissions.slice(0, 3).map((submission, index) => (
                        <div key={index} className="list-group-item border-0 px-0">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <div className="fw-bold">{submission.quizTitle}</div>
                              <small className="text-muted">
                                Score: {submission.score || 'N/A'}%
                              </small>
                            </div>
                            <small className="text-muted">
                              {new Date(submission.submittedAt).toLocaleDateString()}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted text-center">No submissions yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard; 