import React, { useState, useEffect } from 'react';
import { api, endpoints } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const SystemAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${endpoints.admin.analytics}?timeRange=${timeRange}`);
      setAnalytics(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading analytics..." />;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">System Analytics</h1>
            <select 
              className="form-select w-auto"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          {/* Key Metrics */}
          <div className="row mb-4">
            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-primary shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Total Quiz Attempts
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {analytics?.totalAttempts || 0}
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
                        {analytics?.averageScore || 0}%
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
                        Active Users
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {analytics?.activeUsers || 0}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-people text-info" style={{ fontSize: '2rem' }}></i>
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
                        Completion Rate
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {analytics?.completionRate || 0}%
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-percent text-warning" style={{ fontSize: '2rem' }}></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts and Detailed Analytics */}
          <div className="row">
            <div className="col-lg-8">
              <div className="card shadow mb-4">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">Quiz Activity Over Time</h6>
                </div>
                <div className="card-body">
                  <div className="chart-area" style={{ height: '300px' }}>
                    <div className="d-flex justify-content-center align-items-center h-100">
                      <div className="text-center">
                        <i className="bi bi-bar-chart text-muted" style={{ fontSize: '3rem' }}></i>
                        <p className="text-muted mt-2">Chart visualization would go here</p>
                        <small className="text-muted">Integration with Chart.js or similar library</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card shadow mb-4">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">Popular Quiz Categories</h6>
                </div>
                <div className="card-body">
                  {analytics?.popularCategories?.map((category, index) => (
                    <div key={index} className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-sm font-weight-bold">{category.name}</span>
                        <span className="text-sm">{category.count} quizzes</span>
                      </div>
                      <div className="progress" style={{ height: '8px' }}>
                        <div 
                          className="progress-bar bg-primary" 
                          style={{ width: `${(category.count / analytics.totalQuizzes) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center text-muted">
                      <i className="bi bi-pie-chart mb-2" style={{ fontSize: '2rem' }}></i>
                      <p>No category data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="row">
            <div className="col-lg-6">
              <div className="card shadow mb-4">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">Top Performing Students</h6>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Student</th>
                          <th>Average Score</th>
                          <th>Quizzes Taken</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics?.topStudents?.map((student, index) => (
                          <tr key={index}>
                            <td>
                              <span className="badge bg-primary">{index + 1}</span>
                            </td>
                            <td>{student.name}</td>
                            <td>{student.averageScore}%</td>
                            <td>{student.quizzesTaken}</td>
                          </tr>
                        )) || (
                          <tr>
                            <td colSpan="4" className="text-center text-muted">
                              No data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card shadow mb-4">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">Most Active Professors</h6>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Professor</th>
                          <th>Quizzes Created</th>
                          <th>Students</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics?.topProfessors?.map((professor, index) => (
                          <tr key={index}>
                            <td>
                              <span className="badge bg-success">{index + 1}</span>
                            </td>
                            <td>{professor.name}</td>
                            <td>{professor.quizzesCreated}</td>
                            <td>{professor.studentsCount}</td>
                          </tr>
                        )) || (
                          <tr>
                            <td colSpan="4" className="text-center text-muted">
                              No data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
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

export default SystemAnalytics; 