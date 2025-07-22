import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initialCheck, setInitialCheck] = useState(false);

    // Debug function
    const debugState = () => {
        console.log('AuthContext - Current state:', {
            user: user,
            token: token,
            loading: loading,
            initialCheck: initialCheck,
            localStorage_token: localStorage.getItem('token')
        });
    };

    // Check if user is authenticated on app load
    useEffect(() => {
        if (initialCheck) return; // Prevent multiple runs
        
        console.log('AuthContext - Initial useEffect triggered, verifying token...');
        const verifyToken = async () => {
            const storedToken = localStorage.getItem('token');
            console.log('AuthContext - Stored token:', storedToken ? 'exists' : 'not found');
            
            if (storedToken) {
                try {
                    // Set token in API headers
                    api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                    console.log('AuthContext - Verifying token with backend...');
                    
                    // Verify token with backend
                    const response = await api.get('/auth/verify');
                    console.log('AuthContext - Token verification successful:', response.data.user);
                    
                    setUser(response.data.user);
                    setToken(storedToken);
                } catch (error) {
                    // Token is invalid, remove it
                    console.log('AuthContext - Token verification failed:', error.message);
                    localStorage.removeItem('token');
                    delete api.defaults.headers.common['Authorization'];
                    setUser(null);
                    setToken(null);
                }
            } else {
                // No token found
                setUser(null);
                setToken(null);
            }
            setLoading(false);
            setInitialCheck(true);
            console.log('AuthContext - Verification complete, loading set to false');
        };

        verifyToken();
    }, [initialCheck]);

    // Login function
    const login = async (userData, userToken) => {
        try {
            console.log('AuthContext - Login called with:', userData, 'token:', userToken ? 'provided' : 'missing');
            
            // Store token
            localStorage.setItem('token', userToken);
            
            // Set token in API headers
            api.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
            
            // Update state synchronously
            setToken(userToken);
            setUser(userData);
            
            console.log('AuthContext - Login successful, user set:', userData);
            debugState();
            return { success: true };
        } catch (error) {
            console.error('AuthContext - Login error:', error);
            return { success: false, error: error.message };
        }
    };

    // Logout function
    const logout = () => {
        console.log('AuthContext - Logout called');
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        setToken(null);
        debugState();
    };

    // Check if user has specific role
    const hasRole = (requiredRole) => {
        return user?.role === requiredRole;
    };

    // Role check helpers
    const isAdmin = () => user?.role === 'admin';
    const isProfessor = () => user?.role === 'professor';
    const isStudent = () => user?.role === 'student';

    // Get user info (for debugging)
    const getUserInfo = () => ({
        user: user,
        token: token,
        isAuthenticated: !!user,
        role: user?.role
    });

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        hasRole,
        isAdmin,
        isProfessor,
        isStudent,
        getUserInfo,
        debugState
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext; 