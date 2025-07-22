import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null }) => {
    const { user, loading, token } = useAuth();
    const location = useLocation();

    // Debug logging
    console.log('ProtectedRoute - Current state:', {
        user: user,
        loading: loading,
        token: token,
        requiredRole: requiredRole,
        currentPath: location.pathname,
        userRole: user?.role
    });

    // Show loading spinner while checking authentication
    if (loading) {
        console.log('ProtectedRoute - Still loading, showing spinner...');
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    // Check if user is authenticated
    const isAuthenticated = user && token;

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
        console.log('ProtectedRoute - User not authenticated, redirecting to login');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If specific role is required and user doesn't have it, redirect to appropriate dashboard
    if (requiredRole && user.role !== requiredRole) {
        console.log('ProtectedRoute - Role mismatch. Required:', requiredRole, 'User role:', user.role);
        // Redirect to user's appropriate dashboard
        if (user.role === 'admin') {
            return <Navigate to="/admin/dashboard" replace />;
        } else if (user.role === 'professor') {
            return <Navigate to="/professor/dashboard" replace />;
        } else {
            return <Navigate to="/student/dashboard" replace />;
        }
    }

    // If authenticated and authorized, render the component
    console.log('ProtectedRoute - Access granted, rendering component for user:', user.username);
    return children;
};

export default ProtectedRoute; 