import React, { useState, useEffect } from 'react';
import { api, endpoints } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    user: '',
    dateFrom: '',
    dateTo: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...filters
      });
      
      const response = await api.get(`${endpoints.admin.auditLogs}?${params}`);
      setLogs(response.data.logs);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const getActionBadgeClass = (action) => {
    switch (action.toLowerCase()) {
      case 'login': return 'bg-success';
      case 'logout': return 'bg-info';
      case 'create': return 'bg-primary';
      case 'update': return 'bg-warning';
      case 'delete': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  const getActionIcon = (action) => {
    switch (action.toLowerCase()) {
      case 'login': return 'bi-box-arrow-in-right';
      case 'logout': return 'bi-box-arrow-left';
      case 'create': return 'bi-plus-circle';
      case 'update': return 'bi-pencil';
      case 'delete': return 'bi-trash';
      default: return 'bi-activity';
    }
  };

  if (loading) return <LoadingSpinner text="Loading audit logs..." />;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">Audit Logs</h1>
            <div className="text-muted">
              <i className="bi bi-shield-check me-1"></i>
              Security & Activity Monitor
            </div>
          </div>

          {/* Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Action</label>
                  <select
                    className="form-select"
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                  >
                    <option value="">All Actions</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">User</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Filter by user email..."
                    value={filters.user}
                    onChange={(e) => handleFilterChange('user', e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Date From</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Date To</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Activity Logs</h5>
              <small className="text-muted">Page {currentPage} of {totalPages}</small>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>User</th>
                      <th>Resource</th>
                      <th>IP Address</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => (
                      <tr key={index}>
                        <td>
                          <div className="text-sm">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getActionBadgeClass(log.action)} d-flex align-items-center`}>
                            <i className={`${getActionIcon(log.action)} me-1`}></i>
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <div>
                            <div className="fw-bold">{log.userName}</div>
                            <small className="text-muted">{log.userEmail}</small>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div className="fw-bold">{log.resourceType}</div>
                            <small className="text-muted">ID: {log.resourceId}</small>
                          </div>
                        </td>
                        <td>
                          <code className="text-muted">{log.ipAddress}</code>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            data-bs-toggle="modal"
                            data-bs-target={`#logModal${index}`}
                          >
                            View
                          </button>
                          
                          {/* Log Details Modal */}
                          <div className="modal fade" id={`logModal${index}`} tabIndex="-1">
                            <div className="modal-dialog modal-lg">
                              <div className="modal-content">
                                <div className="modal-header">
                                  <h5 className="modal-title">Log Details</h5>
                                  <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div className="modal-body">
                                  <div className="row">
                                    <div className="col-sm-3"><strong>Timestamp:</strong></div>
                                    <div className="col-sm-9">{new Date(log.timestamp).toLocaleString()}</div>
                                  </div>
                                  <div className="row">
                                    <div className="col-sm-3"><strong>Action:</strong></div>
                                    <div className="col-sm-9">{log.action}</div>
                                  </div>
                                  <div className="row">
                                    <div className="col-sm-3"><strong>User:</strong></div>
                                    <div className="col-sm-9">{log.userName} ({log.userEmail})</div>
                                  </div>
                                  <div className="row">
                                    <div className="col-sm-3"><strong>Resource:</strong></div>
                                    <div className="col-sm-9">{log.resourceType} (ID: {log.resourceId})</div>
                                  </div>
                                  <div className="row">
                                    <div className="col-sm-3"><strong>IP Address:</strong></div>
                                    <div className="col-sm-9">{log.ipAddress}</div>
                                  </div>
                                  <div className="row">
                                    <div className="col-sm-3"><strong>User Agent:</strong></div>
                                    <div className="col-sm-9">{log.userAgent}</div>
                                  </div>
                                  {log.details && (
                                    <div className="row">
                                      <div className="col-sm-3"><strong>Details:</strong></div>
                                      <div className="col-sm-9">
                                        <pre className="bg-light p-2 rounded">{JSON.stringify(log.details, null, 2)}</pre>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav className="mt-4">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      >
                        Previous
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs; 