import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        action: '',
        date_from: '',
        date_to: '',
        user_id: '',
        page: 1,
        limit: 50
    });

    useEffect(() => {
        fetchAuditLogs();
    }, [filters]);

    const fetchAuditLogs = async () => {
        try {
            console.log('AuditLogs - Fetching audit logs...');
            setLoading(true);
            const queryParams = new URLSearchParams();
            
            Object.entries(filters).forEach(([key, value]) => {
                if (value) {
                    queryParams.append(key, value);
                }
            });
            
            const response = await api.get(`/admin/audit-logs?${queryParams.toString()}`);
            console.log('AuditLogs - Logs fetched:', response.data);
            setLogs(response.data.logs || []);
            setError('');
        } catch (err) {
            console.error('AuditLogs - Error fetching logs:', err);
            setError(err.response?.data?.message || 'Failed to fetch audit logs');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: 1 // Reset to first page when filtering
        }));
    };

    const clearFilters = () => {
        setFilters({
            action: '',
            date_from: '',
            date_to: '',
            user_id: '',
            page: 1,
            limit: 50
        });
    };

    const getActionBadgeClass = (action) => {
        switch (action?.toLowerCase()) {
            case 'login': return 'bg-success';
            case 'logout': return 'bg-info';
            case 'register': return 'bg-primary';
            case 'create': return 'bg-success';
            case 'update': return 'bg-warning';
            case 'delete': return 'bg-danger';
            case 'failed_login': return 'bg-danger';
            default: return 'bg-secondary';
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Audit Logs</h2>
                <button className="btn btn-primary" onClick={fetchAuditLogs}>
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

            {/* Filters */}
            <div className="card mb-4">
                <div className="card-header">
                    <h5 className="mb-0">Filters</h5>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-3 mb-3">
                            <label className="form-label">Action</label>
                            <select 
                                className="form-select" 
                                value={filters.action} 
                                onChange={(e) => handleFilterChange('action', e.target.value)}
                            >
                                <option value="">All Actions</option>
                                <option value="LOGIN">Login</option>
                                <option value="LOGOUT">Logout</option>
                                <option value="REGISTER">Register</option>
                                <option value="CREATE">Create</option>
                                <option value="UPDATE">Update</option>
                                <option value="DELETE">Delete</option>
                                <option value="FAILED_LOGIN">Failed Login</option>
                            </select>
                        </div>
                        <div className="col-md-3 mb-3">
                            <label className="form-label">From Date</label>
                            <input 
                                type="date" 
                                className="form-control" 
                                value={filters.date_from}
                                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                            />
                        </div>
                        <div className="col-md-3 mb-3">
                            <label className="form-label">To Date</label>
                            <input 
                                type="date" 
                                className="form-control" 
                                value={filters.date_to}
                                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                            />
                        </div>
                        <div className="col-md-3 mb-3">
                            <label className="form-label">User ID</label>
                            <input 
                                type="number" 
                                className="form-control" 
                                value={filters.user_id}
                                onChange={(e) => handleFilterChange('user_id', e.target.value)}
                                placeholder="Enter user ID"
                            />
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-outline-secondary" onClick={clearFilters}>
                            <i className="fas fa-times me-2"></i>
                            Clear Filters
                        </button>
                        <button className="btn btn-primary" onClick={fetchAuditLogs}>
                            <i className="fas fa-search me-2"></i>
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="card">
                <div className="card-header">
                    <h5 className="mb-0">Audit Logs ({logs.length})</h5>
                </div>
                <div className="card-body">
                    {loading ? (
                        <div className="d-flex justify-content-center">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-4">
                            <i className="fas fa-file-alt fa-3x text-muted mb-3"></i>
                            <p className="text-muted">No audit logs found.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>User</th>
                                        <th>Action</th>
                                        <th>Success</th>
                                        <th>IP Address</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id}>
                                            <td>{formatDate(log.timestamp)}</td>
                                            <td>
                                                {log.user_id ? (
                                                    <span>
                                                        <i className="fas fa-user me-1"></i>
                                                        {log.user_id}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">Anonymous</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`badge ${getActionBadgeClass(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td>
                                                {log.success ? (
                                                    <span className="text-success">
                                                        <i className="fas fa-check-circle"></i>
                                                    </span>
                                                ) : (
                                                    <span className="text-danger">
                                                        <i className="fas fa-times-circle"></i>
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <small className="text-muted">{log.ip_address}</small>
                                            </td>
                                            <td>
                                                {log.details ? (
                                                    <small className="text-muted">
                                                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                                                    </small>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditLogs; 