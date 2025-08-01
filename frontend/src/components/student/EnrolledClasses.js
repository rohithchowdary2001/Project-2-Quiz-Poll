import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const EnrolledClasses = () => {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchEnrolledClasses();
    }, []);

    const fetchEnrolledClasses = async () => {
        try {
            console.log('EnrolledClasses - Fetching enrolled classes...');
            setLoading(true);
            const response = await api.get('/classes?sortBy=enrolled_at&sortOrder=DESC');
            console.log('EnrolledClasses - Classes fetched:', response.data);
            setClasses(response.data.classes || []);
            setError('');
        } catch (err) {
            console.error('EnrolledClasses - Error fetching classes:', err);
            setError(err.response?.data?.message || 'Failed to fetch enrolled classes');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
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
                <h2>My Enrolled Classes</h2>
                <button className="btn btn-primary" onClick={fetchEnrolledClasses}>
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

            {classes.length === 0 ? (
                <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    You are not enrolled in any classes yet. Contact your professors to get enrolled.
                </div>
            ) : (
                <div className="row">
                    {classes.map(classItem => (
                        <div key={classItem.id} className="col-md-6 col-lg-4 mb-4">
                            <div className="card h-100">
                                <div className="card-header d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0">{classItem.name}</h5>
                                    <span className="badge bg-primary">{classItem.class_code}</span>
                                </div>
                                <div className="card-body">
                                    <p className="card-text text-muted">{classItem.description}</p>
                                    
                                    <div className="mb-3">
                                        <small className="text-muted">
                                            <i className="fas fa-user me-1"></i>
                                            <strong>Professor:</strong> {classItem.first_name} {classItem.last_name}
                                        </small>
                                    </div>

                                    <div className="row text-center mb-3">
                                        <div className="col-6">
                                            <small className="text-muted">Classmates</small>
                                            <div className="fw-bold">{(classItem.student_count || 1) - 1}</div>
                                        </div>
                                        <div className="col-6">
                                            <small className="text-muted">Available Quizzes</small>
                                            <div className="fw-bold">{classItem.quiz_count || 0}</div>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <small className="text-muted">
                                            <i className="fas fa-calendar me-1"></i>
                                            <strong>Enrolled:</strong> {formatDate(classItem.enrolled_at)}
                                        </small>
                                    </div>
                                </div>
                                <div className="card-footer">
                                    <div className="d-grid gap-2">
                                        <a 
                                            href={`/student/quizzes?classId=${classItem.id}`}
                                            className="btn btn-primary"
                                        >
                                            <i className="fas fa-list-check me-2"></i>
                                            View Quizzes
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Quick Stats */}
            {classes.length > 0 && (
                <div className="card mt-4">
                    <div className="card-header">
                        <h5 className="mb-0">Quick Overview</h5>
                    </div>
                    <div className="card-body">
                        <div className="row text-center">
                            <div className="col-md-3">
                                <div className="h4 text-primary">{classes.length}</div>
                                <small className="text-muted">Enrolled Classes</small>
                            </div>
                            <div className="col-md-3">
                                <div className="h4 text-success">
                                    {classes.reduce((sum, cls) => sum + (cls.quiz_count || 0), 0)}
                                </div>
                                <small className="text-muted">Total Quizzes</small>
                            </div>
                            <div className="col-md-3">
                                <div className="h4 text-info">
                                    {classes.reduce((sum, cls) => sum + (cls.student_count || 0), 0)}
                                </div>
                                <small className="text-muted">Total Classmates</small>
                            </div>
                            <div className="col-md-3">
                                <div className="h4 text-warning">
                                    {classes.filter(cls => cls.quiz_count > 0).length}
                                </div>
                                <small className="text-muted">Active Classes</small>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnrolledClasses; 