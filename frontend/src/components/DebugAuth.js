import React from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const DebugAuth = () => {
    const { user, token, loading, getUserInfo, debugState } = useAuth();

    const testTokenVerification = async () => {
        try {
            console.log('Testing token verification...');
            const response = await api.get('/auth/verify');
            console.log('Token verification response:', response.data);
            alert('Token verification successful! Check console for details.');
        } catch (error) {
            console.error('Token verification failed:', error);
            alert('Token verification failed! Check console for details.');
        }
    };

    const checkLocalStorage = () => {
        const token = localStorage.getItem('token');
        console.log('LocalStorage token:', token);
        alert(`LocalStorage token: ${token ? 'exists' : 'not found'}`);
    };

    const clearLocalStorage = () => {
        localStorage.removeItem('token');
        window.location.reload();
    };

    return (
        <div className="container mt-4">
            <div className="card">
                <div className="card-header">
                    <h3>Authentication Debug</h3>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-6">
                            <h5>Current State:</h5>
                            <ul className="list-group">
                                <li className="list-group-item">
                                    <strong>Loading:</strong> {loading ? 'true' : 'false'}
                                </li>
                                <li className="list-group-item">
                                    <strong>User:</strong> {user ? user.username : 'null'}
                                </li>
                                <li className="list-group-item">
                                    <strong>Role:</strong> {user?.role || 'none'}
                                </li>
                                <li className="list-group-item">
                                    <strong>Token (Context):</strong> {token ? 'exists' : 'none'}
                                </li>
                                <li className="list-group-item">
                                    <strong>Token (LocalStorage):</strong> {localStorage.getItem('token') ? 'exists' : 'none'}
                                </li>
                            </ul>
                            
                            {user && (
                                <div className="mt-3">
                                    <h6>User Details:</h6>
                                    <pre>{JSON.stringify(user, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                        
                        <div className="col-md-6">
                            <h5>Actions:</h5>
                            <div className="d-grid gap-2">
                                <button className="btn btn-primary" onClick={debugState}>
                                    Log State to Console
                                </button>
                                <button className="btn btn-info" onClick={testTokenVerification}>
                                    Test Token Verification
                                </button>
                                <button className="btn btn-warning" onClick={checkLocalStorage}>
                                    Check LocalStorage
                                </button>
                                <button className="btn btn-danger" onClick={clearLocalStorage}>
                                    Clear LocalStorage & Reload
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DebugAuth; 