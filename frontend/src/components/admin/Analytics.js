import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const Analytics = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            console.log('Analytics - Fetching analytics data...');
            setLoading(true);
            const response = await api.get('/admin/analytics');
            console.log('Analytics - Data fetched:', response.data);
            setAnalytics(response.data);
            setError('');
        } catch (err) {
            console.error('Analytics - Error fetching analytics:', err);
            setError(err.response?.data?.message || 'Failed to fetch analytics');
        } finally {
            setLoading(false);
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
                <h2>Analytics Dashboard</h2>
                <button className="btn btn-primary" onClick={fetchAnalytics}>
                    <i className="fas fa-sync-alt me-2"></i>
                    Refresh
                </button>
            </div>

            {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
            )}

            {analytics ? (
                <div className="row">
                    {/* Overview Cards */}
                    <div className="col-md-3 mb-4">
                        <div className="card bg-primary text-white">
                            <div className="card-body">
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <h5 className="card-title">Total Users</h5>
                                        <h3 className="mb-0">{analytics.users?.total || 0}</h3>
                                    </div>
                                    <div>
                                        <i className="fas fa-users fa-2x"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3 mb-4">
                        <div className="card bg-success text-white">
                            <div className="card-body">
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <h5 className="card-title">Active Quizzes</h5>
                                        <h3 className="mb-0">{analytics.quizzes?.active || 0}</h3>
                                    </div>
                                    <div>
                                        <i className="fas fa-question-circle fa-2x"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3 mb-4">
                        <div className="card bg-info text-white">
                            <div className="card-body">
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <h5 className="card-title">Total Classes</h5>
                                        <h3 className="mb-0">{analytics.classes?.total || 0}</h3>
                                    </div>
                                    <div>
                                        <i className="fas fa-chalkboard-teacher fa-2x"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3 mb-4">
                        <div className="card bg-warning text-white">
                            <div className="card-body">
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <h5 className="card-title">Quiz Submissions</h5>
                                        <h3 className="mb-0">{analytics.submissions?.total || 0}</h3>
                                    </div>
                                    <div>
                                        <i className="fas fa-clipboard-check fa-2x"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* User Distribution */}
                    <div className="col-md-6 mb-4">
                        <div className="card">
                            <div className="card-header">
                                <h5 className="mb-0">User Distribution</h5>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-4 text-center">
                                        <div className="mb-2">
                                            <span className="badge bg-danger fs-6">{analytics.users?.admins || 0}</span>
                                        </div>
                                        <small className="text-muted">Admins</small>
                                    </div>
                                    <div className="col-4 text-center">
                                        <div className="mb-2">
                                            <span className="badge bg-warning fs-6">{analytics.users?.professors || 0}</span>
                                        </div>
                                        <small className="text-muted">Professors</small>
                                    </div>
                                    <div className="col-4 text-center">
                                        <div className="mb-2">
                                            <span className="badge bg-info fs-6">{analytics.users?.students || 0}</span>
                                        </div>
                                        <small className="text-muted">Students</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="col-md-6 mb-4">
                        <div className="card">
                            <div className="card-header">
                                <h5 className="mb-0">System Status</h5>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-12">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span>Active Users (24h)</span>
                                            <span className="badge bg-success">{analytics.users?.active_24h || 0}</span>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span>Quizzes Created (7d)</span>
                                            <span className="badge bg-primary">{analytics.quizzes?.created_7d || 0}</span>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span>Quiz Attempts (7d)</span>
                                            <span className="badge bg-info">{analytics.submissions?.last_7d || 0}</span>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span>Average Score</span>
                                            <span className="badge bg-warning">{analytics.submissions?.avg_score || 0}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Registrations */}
                    {analytics.recentUsers && analytics.recentUsers.length > 0 && (
                        <div className="col-12 mb-4">
                            <div className="card">
                                <div className="card-header">
                                    <h5 className="mb-0">Recent Registrations</h5>
                                </div>
                                <div className="card-body">
                                    <div className="table-responsive">
                                        <table className="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Role</th>
                                                    <th>Registered</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {analytics.recentUsers.map(user => (
                                                    <tr key={user.id}>
                                                        <td>{user.first_name} {user.last_name}</td>
                                                        <td>{user.email}</td>
                                                        <td>
                                                            <span className={`badge ${user.role === 'admin' ? 'bg-danger' : user.role === 'professor' ? 'bg-warning' : 'bg-info'}`}>
                                                                {user.role}
                                                            </span>
                                                        </td>
                                                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    No analytics data available. Click refresh to load data.
                </div>
            )}
        </div>
    );
};

export default Analytics; 