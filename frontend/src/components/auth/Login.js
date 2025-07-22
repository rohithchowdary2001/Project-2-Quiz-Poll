import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const Login = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            console.log('Login - User already authenticated, redirecting to dashboard...');
            if (user.role === 'admin') {
                navigate('/admin/dashboard', { replace: true });
            } else if (user.role === 'professor') {
                navigate('/professor/dashboard', { replace: true });
            } else {
                navigate('/student/dashboard', { replace: true });
            }
        }
    }, [user, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            console.log('Login - Attempting login with:', formData);
            const response = await api.post('/auth/login', formData);
            console.log('Login - Login response:', response.data);
            
            const { user, token } = response.data;
            
            const loginResult = await login(user, token);
            
            if (loginResult.success) {
                console.log('Login - Login successful, user authenticated:', user);
                
                // Small delay to ensure state is set before navigation
                setTimeout(() => {
                    console.log('Login - Navigating to dashboard for role:', user.role);
                    if (user.role === 'admin') {
                        navigate('/admin/dashboard', { replace: true });
                    } else if (user.role === 'professor') {
                        navigate('/professor/dashboard', { replace: true });
                    } else {
                        navigate('/student/dashboard', { replace: true });
                    }
                }, 100);
            } else {
                setError(loginResult.error || 'Login failed');
            }
        } catch (err) {
            console.error('Login - Login error:', err);
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-6 col-lg-4">
                        <div className="card shadow-lg border-0">
                            <div className="card-header bg-primary text-white text-center py-4">
                                <h3 className="mb-0">
                                    <i className="fas fa-graduation-cap me-2"></i>
                                    Quiz Management
                                </h3>
                                <small>Sign in to your account</small>
                            </div>
                            <div className="card-body p-4">
                                {error && (
                                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                                        <i className="fas fa-exclamation-circle me-2"></i>
                                        {error}
                                        <button
                                            type="button"
                                            className="btn-close"
                                            onClick={() => setError('')}
                                        ></button>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label htmlFor="username" className="form-label">
                                            Username or Email
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text">
                                                <i className="fas fa-user"></i>
                                            </span>
                                            <input
                                                type="text"
                                                className="form-control"
                                                id="username"
                                                name="username"
                                                value={formData.username}
                                                onChange={handleChange}
                                                required
                                                placeholder="Enter username or email"
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label htmlFor="password" className="form-label">
                                            Password
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text">
                                                <i className="fas fa-lock"></i>
                                            </span>
                                            <input
                                                type="password"
                                                className="form-control"
                                                id="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                required
                                                placeholder="Enter password"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100 py-2"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Signing in...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-sign-in-alt me-2"></i>
                                                Sign In
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="text-center mt-3">
                                    <p className="text-muted mb-0">
                                        Don't have an account?{' '}
                                        <Link to="/register" className="text-primary text-decoration-none">
                                            Sign up here
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login; 