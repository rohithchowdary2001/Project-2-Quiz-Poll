import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [newRole, setNewRole] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            console.log('UserManagement - Fetching users...');
            setLoading(true);
            const response = await api.get('/users');
            console.log('UserManagement - Users fetched:', response.data);
            setUsers(response.data.users || []);
            setError('');
        } catch (err) {
            console.error('UserManagement - Error fetching users:', err);
            setError(err.response?.data?.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, role) => {
        try {
            console.log(`UserManagement - Updating user ${userId} role to ${role}`);
            const response = await api.put(`/users/${userId}/role`, { role });
            console.log('UserManagement - Role updated:', response.data);
            
            // Update local state
            setUsers(users.map(user => 
                user.id === userId ? { ...user, role } : user
            ));
            
            setShowRoleModal(false);
            setSelectedUser(null);
        } catch (err) {
            console.error('UserManagement - Error updating role:', err);
            setError(err.response?.data?.message || 'Failed to update role');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            console.log(`UserManagement - Deleting user ${userId}`);
            await api.delete(`/users/${userId}`);
            console.log('UserManagement - User deleted successfully');
            
            // Remove user from local state
            setUsers(users.filter(user => user.id !== userId));
        } catch (err) {
            console.error('UserManagement - Error deleting user:', err);
            setError(err.response?.data?.message || 'Failed to delete user');
        }
    };

    const openRoleModal = (user) => {
        setSelectedUser(user);
        setNewRole(user.role);
        setShowRoleModal(true);
    };

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'admin': return 'bg-danger';
            case 'professor': return 'bg-warning';
            case 'student': return 'bg-info';
            default: return 'bg-secondary';
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
                <h2>User Management</h2>
                <button className="btn btn-primary" onClick={fetchUsers}>
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

            <div className="card">
                <div className="card-header">
                    <h5 className="mb-0">All Users ({users.length})</h5>
                </div>
                <div className="card-body">
                    {users.length === 0 ? (
                        <p className="text-muted">No users found.</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-striped">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Last Login</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id}>
                                            <td>{user.id}</td>
                                            <td>{user.first_name} {user.last_name}</td>
                                            <td>{user.username}</td>
                                            <td>{user.email}</td>
                                            <td>
                                                <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${user.is_active ? 'bg-success' : 'bg-secondary'}`}>
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-outline-primary me-2"
                                                    onClick={() => openRoleModal(user)}
                                                >
                                                    <i className="fas fa-user-cog"></i>
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Role Change Modal */}
            {showRoleModal && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Change User Role</h5>
                                <button type="button" className="btn-close" onClick={() => setShowRoleModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p>Change role for <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong>?</p>
                                <div className="mb-3">
                                    <label className="form-label">New Role:</label>
                                    <select 
                                        className="form-select" 
                                        value={newRole} 
                                        onChange={(e) => setNewRole(e.target.value)}
                                    >
                                        <option value="student">Student</option>
                                        <option value="professor">Professor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary" 
                                    onClick={() => handleRoleChange(selectedUser.id, newRole)}
                                >
                                    Update Role
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement; 