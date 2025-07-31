import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotFound = () => {
  const { user } = useAuth();

  const getDashboardLink = () => {
    if (!user) return '/login';
    return '/dashboard';
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 text-center">
            <div className="card shadow">
              <div className="card-body p-5">
                <div className="display-1 text-primary mb-3">
                  <i className="bi bi-exclamation-triangle"></i>
                </div>
                <h1 className="display-4 mb-3">404</h1>
                <h2 className="h4 mb-3">Page Not Found</h2>
                <p className="text-muted mb-4">
                  Sorry, the page you are looking for doesn't exist or has been moved.
                </p>
                
                <div className="d-flex justify-content-center gap-3">
                  <Link 
                    to={getDashboardLink()} 
                    className="btn btn-primary"
                  >
                    <i className="bi bi-house me-2"></i>
                    Go to Dashboard
                  </Link>
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => window.history.back()}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Go Back
                  </button>
                </div>

                {user && (
                  <div className="mt-4">
                    <p className="text-muted mb-2">Quick links:</p>
                    <div className="d-flex justify-content-center gap-2">
                      {user.role === 'admin' && (
                        <>
                          <Link to="/admin/users" className="btn btn-sm btn-outline-primary">
                            User Management
                          </Link>
                          <Link to="/admin/analytics" className="btn btn-sm btn-outline-primary">
                            Analytics
                          </Link>
                        </>
                      )}
                      {user.role === 'professor' && (
                        <>
                          <Link to="/professor/classes" className="btn btn-sm btn-outline-primary">
                            Classes
                          </Link>
                          <Link to="/professor/quizzes" className="btn btn-sm btn-outline-primary">
                            Quizzes
                          </Link>
                        </>
                      )}
                      {user.role === 'student' && (
                        <>
                          <Link to="/student/quizzes" className="btn btn-sm btn-outline-primary">
                            Available Quizzes
                          </Link>
                          <Link to="/student/history" className="btn btn-sm btn-outline-primary">
                            Quiz History
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 