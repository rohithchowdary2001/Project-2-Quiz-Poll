import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import Navbar from './components/common/Navbar';
import DebugAuth from './components/DebugAuth';
import { useAuth } from './context/AuthContext';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Admin Components
import UserManagement from './components/admin/UserManagement';
import Analytics from './components/admin/Analytics';
import AuditLogs from './components/admin/AuditLogs';

// Professor Components
import ClassManagement from './components/professor/ClassManagement';
import QuizManagement from './components/professor/QuizManagement';
import QuizResults from './components/professor/QuizResults';

// Student Components
import AvailableQuizzes from './components/student/AvailableQuizzes';
import QuizHistory from './components/student/QuizHistory';
import EnrolledClasses from './components/student/EnrolledClasses';
import QuizTaking from './components/student/QuizTaking';
import PollResults from './components/student/PollResults';

// CSS
import './App.css';

// Debug component to show authentication state
const AuthDebug = () => {
    const { user, token, loading } = useAuth();
    
    if (process.env.NODE_ENV !== 'development') {
        return null;
    }
    
    return (
        <div style={{ 
            position: 'fixed', 
            top: 0, 
            right: 0, 
            background: 'rgba(0,0,0,0.8)', 
            color: 'white', 
            padding: '10px', 
            fontSize: '12px',
            zIndex: 9999,
            maxWidth: '300px'
        }}>
            <strong>Auth Debug:</strong><br/>
            Loading: {loading ? 'true' : 'false'}<br/>
            User: {user ? user.username : 'null'}<br/>
            Role: {user?.role || 'none'}<br/>
            Token: {token ? 'exists' : 'none'}<br/>
            LocalStorage: {localStorage.getItem('token') ? 'exists' : 'none'}
        </div>
    );
};

// Default route component that redirects based on auth state
const DefaultRoute = () => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return <LoadingSpinner />;
    }
    
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    
    // Redirect to appropriate dashboard based on role
    if (user.role === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === 'professor') {
        return <Navigate to="/professor/dashboard" replace />;
    } else {
        return <Navigate to="/student/dashboard" replace />;
    }
};

// Basic Dashboard Components
const AdminDashboard = () => (
    <div className="container mt-4">
        <h2>Admin Dashboard</h2>
        <p>Welcome to the admin dashboard!</p>
        <p>This page should only be visible to admin users.</p>
        <div className="row mt-4">
            <div className="col-md-4">
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title">
                            <i className="fas fa-users me-2 text-primary"></i>
                            User Management
                        </h5>
                        <p className="card-text">Manage users, roles, and permissions.</p>
                        <a href="/admin/users" className="btn btn-primary">Manage Users</a>
                    </div>
                </div>
            </div>
            <div className="col-md-4">
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title">
                            <i className="fas fa-chart-bar me-2 text-success"></i>
                            Analytics
                        </h5>
                        <p className="card-text">View system analytics and reports.</p>
                        <a href="/admin/analytics" className="btn btn-success">View Analytics</a>
                    </div>
                </div>
            </div>
            <div className="col-md-4">
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title">
                            <i className="fas fa-file-alt me-2 text-info"></i>
                            Audit Logs
                        </h5>
                        <p className="card-text">Review system audit logs.</p>
                        <a href="/admin/audit" className="btn btn-info">View Logs</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const ProfessorDashboard = () => (
    <div className="container mt-4">
        <h2>Professor Dashboard</h2>
        <p>Welcome to the professor dashboard!</p>
        <p>Manage your classes, create quizzes, and view student progress.</p>
        <div className="row mt-4">
            <div className="col-md-4">
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title">
                            <i className="fas fa-chalkboard-teacher me-2 text-primary"></i>
                            Class Management
                        </h5>
                        <p className="card-text">Create and manage your classes and students.</p>
                        <a href="/professor/classes" className="btn btn-primary">Manage Classes</a>
                    </div>
                </div>
            </div>
            <div className="col-md-4">
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title">
                            <i className="fas fa-question-circle me-2 text-success"></i>
                            Quiz Management
                        </h5>
                        <p className="card-text">Create and manage quizzes for your classes.</p>
                        <a href="/professor/quizzes" className="btn btn-success">Manage Quizzes</a>
                    </div>
                </div>
            </div>
            <div className="col-md-4">
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title">
                            <i className="fas fa-chart-line me-2 text-info"></i>
                            Quiz Results
                        </h5>
                        <p className="card-text">View quiz results and student analytics.</p>
                        <a href="/professor/quizzes" className="btn btn-info">View Results</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const StudentDashboard = () => (
    <div className="container mt-4">
        <h2>Student Dashboard</h2>
        <p>Welcome to the student dashboard!</p>
        <p>Access your classes, take quizzes, and view your progress.</p>
        <div className="row mt-4">
            <div className="col-md-4">
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title">
                            <i className="fas fa-school me-2 text-primary"></i>
                            My Classes
                        </h5>
                        <p className="card-text">View your enrolled classes and class information.</p>
                        <a href="/student/classes" className="btn btn-primary">View Classes</a>
                    </div>
                </div>
            </div>
            <div className="col-md-4">
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title">
                            <i className="fas fa-list-check me-2 text-success"></i>
                            Available Quizzes
                        </h5>
                        <p className="card-text">View and take available quizzes.</p>
                        <a href="/student/quizzes" className="btn btn-success">View Quizzes</a>
                    </div>
                </div>
            </div>
            <div className="col-md-4">
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title">
                            <i className="fas fa-history me-2 text-info"></i>
                            Quiz History
                        </h5>
                        <p className="card-text">View your quiz results and history.</p>
                        <a href="/student/history" className="btn btn-info">View History</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

function App() {
    return (
        <div className="App">
            <Navbar />
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Debug Route (development only) */}
                {/* <Route path="/debug" element={<DebugAuth />} /> */}
                
                {/* Default redirect based on auth state */}
                <Route path="/" element={<DefaultRoute />} />
                
                {/* Admin Routes */}
                <Route
                    path="/admin/dashboard"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/users"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <UserManagement />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/analytics"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <Analytics />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/audit"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <AuditLogs />
                        </ProtectedRoute>
                    }
                />
                
                {/* Professor Routes */}
                <Route
                    path="/professor/dashboard"
                    element={
                        <ProtectedRoute requiredRole="professor">
                            <ProfessorDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/professor/classes"
                    element={
                        <ProtectedRoute requiredRole="professor">
                            <ClassManagement />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/professor/quizzes"
                    element={
                        <ProtectedRoute requiredRole="professor">
                            <QuizManagement />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/professor/quiz-results/:quizId"
                    element={
                        <ProtectedRoute requiredRole="professor">
                            <QuizResults />
                        </ProtectedRoute>
                    }
                />
                
                {/* Student Routes */}
                <Route
                    path="/student/dashboard"
                    element={
                        <ProtectedRoute requiredRole="student">
                            <StudentDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/student/classes"
                    element={
                        <ProtectedRoute requiredRole="student">
                            <EnrolledClasses />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/student/quizzes"
                    element={
                        <ProtectedRoute requiredRole="student">
                            <AvailableQuizzes />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/student/quiz/:quizId"
                    element={
                        <ProtectedRoute requiredRole="student">
                            <QuizTaking />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/student/history"
                    element={
                        <ProtectedRoute requiredRole="student">
                            <QuizHistory />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/student/poll-results/:quizId"
                    element={
                        <ProtectedRoute requiredRole="student">
                            <PollResults />
                        </ProtectedRoute>
                    }
                />
                
                {/* Catch all - redirect to default route */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App; 