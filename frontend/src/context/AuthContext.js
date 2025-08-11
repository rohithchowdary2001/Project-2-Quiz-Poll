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

    // State tracking function
    const debugState = () => {
        // State tracking removed for production
    };

    // Check if user is authenticated on app load
    useEffect(() => {
        if (initialCheck) return; // Prevent multiple runs
        
        
        const verifyToken = async () => {
            const storedToken = localStorage.getItem('token');
            
            
            if (storedToken) {
                try {
                    // Set token in API headers
                    api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                    
                    
                    // Verify token with backend
                    const response = await api.get('/auth/verify');
                    
                    
                    setUser(response.data.user);
                    setToken(storedToken);
                } catch (error) {
                    // Token is invalid, remove it
                    
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
            
        };

        verifyToken();
    }, [initialCheck]);

    // Login function
    const login = async (userData, userToken) => {
        try {
            
            
            // Store token
            localStorage.setItem('token', userToken);
            
            // Set token in API headers
            api.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
            
            // Update state synchronously
            setToken(userToken);
            setUser(userData);
            
            
            debugState();
            return { success: true };
        } catch (error) {
            console.error('AuthContext - Login error:', error);
            return { success: false, error: error.message };
        }
    };

    // Logout function
    const logout = () => {
        
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
