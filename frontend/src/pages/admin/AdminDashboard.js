import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, endpoints } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.get(endpoints.admin.dashboard);
      setStats(response.data);
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
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: 'bi-people',
      link: '/admin/users',
      color: 'primary'
    },
    {
      title: 'System Analytics',
      description: 'View system performance and usage',
      icon: 'bi-bar-chart',
      link: '/admin/analytics',
      color: 'success'
    },
    {
      title: 'Audit Logs',
      description: 'Review system activity and security logs',
      icon: 'bi-file-text',
      link: '/admin/audit-logs',
      color: 'info'
    }
  ];

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">Admin Dashboard</h1>
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
                        Total Users
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {stats?.totalUsers || 0}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-people text-primary" style={{ fontSize: '2rem' }}></i>
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
                        Active Quizzes
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {stats?.activeQuizzes || 0}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-question-circle text-success" style={{ fontSize: '2rem' }}></i>
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
                        Total Submissions
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {stats?.totalSubmissions || 0}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-file-earmark-check text-info" style={{ fontSize: '2rem' }}></i>
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
                        System Health
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {stats?.systemHealth || 'Good'}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-shield-check text-warning" style={{ fontSize: '2rem' }}></i>
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
            <div className="col-lg-6">
              <div className="card shadow mb-4">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">Recent User Activity</h6>
                </div>
                <div className="card-body">
                  {stats?.recentActivity?.length > 0 ? (
                    <div className="list-group list-group-flush">
                      {stats.recentActivity.slice(0, 5).map((activity, index) => (
                        <div key={index} className="list-group-item border-0 px-0">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <div className="fw-bold">{activity.action}</div>
                              <small className="text-muted">{activity.user}</small>
                            </div>
                            <small className="text-muted">{activity.timestamp}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No recent activity</p>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card shadow mb-4">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">System Status</h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-6">
                      <div className="border-start border-success border-4 ps-3 mb-3">
                        <div className="fw-bold">Database</div>
                        <div className="text-success">
                          <i className="bi bi-check-circle me-1"></i>
                          Connected
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border-start border-success border-4 ps-3 mb-3">
                        <div className="fw-bold">Server</div>
                        <div className="text-success">
                          <i className="bi bi-check-circle me-1"></i>
                          Running
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="fw-bold mb-2">Storage Usage</div>
                    <div className="progress">
                      <div 
                        className="progress-bar" 
                        role="progressbar" 
                        style={{ width: `${stats?.storageUsage || 45}%` }}
                      >
                        {stats?.storageUsage || 45}%
                      </div>
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

export default AdminDashboard; 