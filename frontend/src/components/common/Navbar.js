import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const getDashboardLink = () => {
    switch (user?.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'professor':
        return '/professor/dashboard';
      case 'student':
        return '/student/dashboard';
      default:
        return '/login';
    }
  };

  const getNavLinks = () => {
    const roleLinks = {
      admin: [
        { path: '/admin/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
        { path: '/admin/users', label: 'User Management', icon: 'fas fa-users' },
        { path: '/admin/analytics', label: 'Analytics', icon: 'fas fa-chart-bar' },
        { path: '/admin/audit', label: 'Audit Logs', icon: 'fas fa-file-alt' },
      ],
      professor: [
        { path: '/professor/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
        { path: '/professor/classes', label: 'Classes', icon: 'fas fa-chalkboard-teacher' },
        { path: '/professor/quizzes', label: 'Quizzes', icon: 'fas fa-question-circle' },
      ],
      student: [
        { path: '/student/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
        { path: '/student/quizzes', label: 'Available Quizzes', icon: 'fas fa-list-check' },
        { path: '/student/history', label: 'Quiz History', icon: 'fas fa-history' },
      ],
    };

    return roleLinks[user?.role] || [];
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <Link className="navbar-brand" to={getDashboardLink()}>
          <i className="fas fa-graduation-cap me-2"></i>
          Quiz Management
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            {getNavLinks().map((link) => (
              <li key={link.path} className="nav-item">
                <Link
                  className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
                  to={link.path}
                >
                  <i className={`${link.icon} me-1`}></i>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <ul className="navbar-nav">
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                id="navbarDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="fas fa-user-circle me-1"></i>
                {user?.firstName} {user?.lastName}
                <span className="badge bg-light text-dark ms-2">
                  {user?.role}
                </span>
              </a>
              <ul className="dropdown-menu" aria-labelledby="navbarDropdown">
                <li>
                  <span className="dropdown-item-text">
                    <small className="text-muted">
                      {user?.email}
                    </small>
                  </span>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt me-2"></i>
                    Logout
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 