import React, { useState, useEffect } from 'react';
import { api, endpoints } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get(endpoints.users.list);
      setUsers(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(endpoints.users.updateRole(userId), { role: newRole });
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      toast.success('User role updated successfully');
    } catch (err) {
      toast.error('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(endpoints.users.delete(userId));
        setUsers(users.filter(user => user.id !== userId));
        toast.success('User deleted successfully');
      } catch (err) {
        toast.error('Failed to delete user');
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                         user.email.toLowerCase().includes(filters.search.toLowerCase());
    const matchesRole = !filters.role || user.role === filters.role;
    const matchesStatus = !filters.status || user.status === filters.status;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'bg-danger';
      case 'professor': return 'bg-warning';
      case 'student': return 'bg-primary';
      default: return 'bg-secondary';
    }
  };

  if (loading) return <LoadingSpinner text="Loading users..." />;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">User Management</h1>
            <div className="text-muted">
              Total Users: {users.length}
            </div>
          </div>

          {/* Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Search Users</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name or email..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Filter by Role</label>
                  <select
                    className="form-select"
                    value={filters.role}
                    onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="professor">Professor</option>
                    <option value="student">Student</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Filter by Status</label>
                  <select
                    className="form-select"
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Users ({filteredUsers.length})</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3" 
                                 style={{ width: '32px', height: '32px' }}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            {user.name}
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <select
                            className={`form-select form-select-sm badge ${getRoleBadgeClass(user.role)}`}
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            style={{ width: 'auto', border: 'none' }}
                          >
                            <option value="student">Student</option>
                            <option value="professor">Professor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <span className={`badge ${user.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                            {user.status}
                          </span>
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="btn-group" role="group">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowEditModal(true);
                              }}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <i className="bi bi-trash"></i>
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

          {/* User Statistics */}
          <div className="row mt-4">
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-shield-check text-danger mb-2" style={{ fontSize: '2rem' }}></i>
                  <div className="h4">{users.filter(u => u.role === 'admin').length}</div>
                  <div className="text-muted">Admins</div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-person-badge text-warning mb-2" style={{ fontSize: '2rem' }}></i>
                  <div className="h4">{users.filter(u => u.role === 'professor').length}</div>
                  <div className="text-muted">Professors</div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-people text-primary mb-2" style={{ fontSize: '2rem' }}></i>
                  <div className="h4">{users.filter(u => u.role === 'student').length}</div>
                  <div className="text-muted">Students</div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-check-circle text-success mb-2" style={{ fontSize: '2rem' }}></i>
                  <div className="h4">{users.filter(u => u.status === 'active').length}</div>
                  <div className="text-muted">Active Users</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement; 