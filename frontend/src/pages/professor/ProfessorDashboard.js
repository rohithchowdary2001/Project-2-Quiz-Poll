import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, endpoints } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const ProfessorDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, quizzesResponse] = await Promise.all([
        api.get(endpoints.users.stats),
        api.get(`${endpoints.quizzes.list}?limit=5&sort=createdAt&order=desc`)
      ]);
      
      setStats(statsResponse.data);
      setRecentQuizzes(quizzesResponse.data.quizzes || []);
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
      title: 'Create Quiz',
      description: 'Create a new quiz for your students',
      icon: 'bi-plus-circle',
      link: '/professor/quizzes/create',
      color: 'primary'
    },
    {
      title: 'Manage Classes',
      description: 'View and manage your classes',
      icon: 'bi-book',
      link: '/professor/classes',
      color: 'success'
    },
    {
      title: 'Quiz Results',
      description: 'View quiz results and analytics',
      icon: 'bi-bar-chart',
      link: '/professor/quizzes',
      color: 'info'
    }
  ];

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-0">Welcome back, {user?.name}!</h1>
              <p className="text-muted">Here's what's happening with your classes and quizzes</p>
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
                        Total Classes
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {stats?.totalClasses || 0}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-book text-primary" style={{ fontSize: '2rem' }}></i>
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
                        Total Students
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {stats?.totalStudents || 0}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-people text-success" style={{ fontSize: '2rem' }}></i>
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
                        Total Quizzes
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {stats?.totalQuizzes || 0}
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
                        Active Quizzes
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {stats?.activeQuizzes || 0}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-play-circle text-warning" style={{ fontSize: '2rem' }}></i>
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
                  <div key={index} className="col-md-4 mb-3">
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
                  <h6 className="m-0 font-weight-bold text-primary">Recent Quizzes</h6>
                  <Link to="/professor/quizzes" className="btn btn-sm btn-outline-primary">
                    View All
                  </Link>
                </div>
                <div className="card-body">
                  {recentQuizzes.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Quiz Title</th>
                            <th>Class</th>
                            <th>Status</th>
                            <th>Submissions</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentQuizzes.map((quiz) => (
                            <tr key={quiz.id}>
                              <td>
                                <div className="fw-bold">{quiz.title}</div>
                                <small className="text-muted">
                                  Created: {new Date(quiz.createdAt).toLocaleDateString()}
                                </small>
                              </td>
                              <td>{quiz.className}</td>
                              <td>
                                <span className={`badge ${quiz.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                                  {quiz.status}
                                </span>
                              </td>
                              <td>{quiz.submissionCount || 0}</td>
                              <td>
                                <div className="btn-group" role="group">
                                  <Link 
                                    to={`/professor/quizzes/${quiz.id}/edit`}
                                    className="btn btn-sm btn-outline-primary"
                                  >
                                    <i className="bi bi-pencil"></i>
                                  </Link>
                                  <Link 
                                    to={`/professor/quizzes/${quiz.id}/results`}
                                    className="btn btn-sm btn-outline-info"
                                  >
                                    <i className="bi bi-bar-chart"></i>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <i className="bi bi-question-circle text-muted mb-3" style={{ fontSize: '3rem' }}></i>
                      <p className="text-muted">No quizzes created yet</p>
                      <Link to="/professor/quizzes/create" className="btn btn-primary">
                        Create Your First Quiz
                      </Link>
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
                      <span className="text-sm">Average Quiz Score</span>
                      <span className="fw-bold">{stats?.averageScore || 0}%</span>
                    </div>
                    <div className="progress">
                      <div 
                        className="progress-bar bg-success" 
                        style={{ width: `${stats?.averageScore || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-sm">Completion Rate</span>
                      <span className="fw-bold">{stats?.completionRate || 0}%</span>
                    </div>
                    <div className="progress">
                      <div 
                        className="progress-bar bg-info" 
                        style={{ width: `${stats?.completionRate || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-center mt-4">
                    <Link to="/professor/quizzes" className="btn btn-outline-primary btn-sm">
                      View Detailed Analytics
                    </Link>
                  </div>
                </div>
              </div>

              <div className="card shadow mb-4">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">Quick Stats</h6>
                </div>
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-6">
                      <div className="border-end border-2">
                        <div className="h4 text-primary">{stats?.totalSubmissions || 0}</div>
                        <div className="text-muted small">Total Submissions</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="h4 text-success">{stats?.averageGrade || 'N/A'}</div>
                      <div className="text-muted small">Average Grade</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessorDashboard; 