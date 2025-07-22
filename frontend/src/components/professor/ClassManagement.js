import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const ClassManagement = () => {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showStudentsModal, setShowStudentsModal] = useState(false);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [classForm, setClassForm] = useState({
        name: '',
        description: '',
        classCode: ''
    });

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            console.log('ClassManagement - Fetching classes...');
            setLoading(true);
            const response = await api.get('/classes?sortBy=created_at&sortOrder=DESC');
            console.log('ClassManagement - Classes fetched:', response.data);
            setClasses(response.data.classes || []);
            setError('');
        } catch (err) {
            console.error('ClassManagement - Error fetching classes:', err);
            setError(err.response?.data?.message || 'Failed to fetch classes');
        } finally {
            setLoading(false);
        }
    };

    const fetchClassStudents = async (classId) => {
        try {
            console.log(`ClassManagement - Fetching students for class ${classId}`);
            const response = await api.get(`/classes/${classId}/students`);
            console.log('ClassManagement - Students fetched:', response.data);
            setStudents(response.data.students || []);
        } catch (err) {
            console.error('ClassManagement - Error fetching students:', err);
            setError(err.response?.data?.message || 'Failed to fetch students');
        }
    };

    const fetchAvailableStudents = async () => {
        try {
            console.log('ClassManagement - Fetching available students...');
            const response = await api.get('/users/students');
            console.log('ClassManagement - Available students:', response.data);
            setAvailableStudents(response.data.students || []);
        } catch (err) {
            console.error('ClassManagement - Error fetching available students:', err);
            setError(err.response?.data?.message || 'Failed to fetch students');
        }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        try {
            console.log('ClassManagement - Creating class:', classForm);
            const response = await api.post('/classes', classForm);
            console.log('ClassManagement - Class created:', response.data);
            
            setShowCreateModal(false);
            setClassForm({ name: '', description: '', classCode: '' });
            fetchClasses();
            alert('Class created successfully!');
        } catch (err) {
            console.error('ClassManagement - Error creating class:', err);
            setError(err.response?.data?.message || 'Failed to create class');
        }
    };

    const handleEnrollStudent = async (studentId) => {
        try {
            console.log(`ClassManagement - Enrolling student ${studentId} in class ${selectedClass.id}`);
            const response = await api.post(`/classes/${selectedClass.id}/students`, { studentId });
            console.log('ClassManagement - Student enrolled:', response.data);
            
            fetchClassStudents(selectedClass.id);
            alert('Student enrolled successfully!');
        } catch (err) {
            console.error('ClassManagement - Error enrolling student:', err);
            alert(err.response?.data?.message || 'Failed to enroll student');
        }
    };

    const handleRemoveStudent = async (studentId) => {
        if (!window.confirm('Are you sure you want to remove this student from the class?')) {
            return;
        }

        try {
            console.log(`ClassManagement - Removing student ${studentId} from class ${selectedClass.id}`);
            await api.delete(`/classes/${selectedClass.id}/students/${studentId}`);
            console.log('ClassManagement - Student removed successfully');
            
            fetchClassStudents(selectedClass.id);
            alert('Student removed successfully!');
        } catch (err) {
            console.error('ClassManagement - Error removing student:', err);
            alert(err.response?.data?.message || 'Failed to remove student');
        }
    };

    const openStudentsModal = (classInfo) => {
        setSelectedClass(classInfo);
        setShowStudentsModal(true);
        fetchClassStudents(classInfo.id);
    };

    const openEnrollModal = (classInfo) => {
        setSelectedClass(classInfo);
        setShowEnrollModal(true);
        fetchAvailableStudents();
    };

    const formatDate = (dateString) => {
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
                <h2>Class Management</h2>
                <div>
                    <button className="btn btn-success me-2" onClick={() => setShowCreateModal(true)}>
                        <i className="fas fa-plus me-2"></i>
                        Create Class
                    </button>
                    <button className="btn btn-primary" onClick={fetchClasses}>
                        <i className="fas fa-sync-alt me-2"></i>
                        Refresh
                    </button>
                </div>
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
                    No classes found. Create your first class to get started!
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
                                    
                                    <div className="row text-center mb-3">
                                        <div className="col-6">
                                            <small className="text-muted">Students</small>
                                            <div className="fw-bold">{classItem.student_count || 0}</div>
                                        </div>
                                        <div className="col-6">
                                            <small className="text-muted">Quizzes</small>
                                            <div className="fw-bold">{classItem.quiz_count || 0}</div>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <small className="text-muted">
                                            <i className="fas fa-calendar me-1"></i>
                                            Created: {formatDate(classItem.created_at)}
                                        </small>
                                    </div>
                                </div>
                                <div className="card-footer">
                                    <div className="btn-group w-100" role="group">
                                        <button 
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => openStudentsModal(classItem)}
                                        >
                                            <i className="fas fa-users me-1"></i>
                                            Students
                                        </button>
                                        <button 
                                            className="btn btn-outline-success btn-sm"
                                            onClick={() => openEnrollModal(classItem)}
                                        >
                                            <i className="fas fa-user-plus me-1"></i>
                                            Enroll
                                        </button>
                                        <a 
                                            href={`/professor/quizzes?classId=${classItem.id}`}
                                            className="btn btn-outline-info btn-sm"
                                        >
                                            <i className="fas fa-question-circle me-1"></i>
                                            Quizzes
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Class Modal */}
            {showCreateModal && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Create New Class</h5>
                                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
                            </div>
                            <form onSubmit={handleCreateClass}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Class Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={classForm.name}
                                            onChange={(e) => setClassForm({...classForm, name: e.target.value})}
                                            required
                                            placeholder="Enter class name"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Class Code</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={classForm.classCode}
                                            onChange={(e) => setClassForm({...classForm, classCode: e.target.value})}
                                            required
                                            placeholder="Enter unique class code"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Description</label>
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            value={classForm.description}
                                            onChange={(e) => setClassForm({...classForm, description: e.target.value})}
                                            placeholder="Enter class description (optional)"
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Create Class
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Students Modal */}
            {showStudentsModal && selectedClass && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Students in {selectedClass.name}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowStudentsModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                {students.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-muted">No students enrolled in this class yet.</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-striped">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Username</th>
                                                    <th>Email</th>
                                                    <th>Quiz Submissions</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {students.map(student => (
                                                    <tr key={student.id}>
                                                        <td>{student.first_name} {student.last_name}</td>
                                                        <td>{student.username}</td>
                                                        <td>{student.email}</td>
                                                        <td>{student.quiz_submissions || 0}</td>
                                                        <td>
                                                            <button
                                                                className="btn btn-sm btn-outline-danger"
                                                                onClick={() => handleRemoveStudent(student.id)}
                                                            >
                                                                <i className="fas fa-times"></i> Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowStudentsModal(false)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enroll Student Modal */}
            {showEnrollModal && selectedClass && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Enroll Student in {selectedClass.name}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowEnrollModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                {availableStudents.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-muted">No students available for enrollment.</p>
                                    </div>
                                ) : (
                                    <div className="list-group">
                                        {availableStudents.map(student => (
                                            <div key={student.id} className="list-group-item d-flex justify-content-between align-items-center">
                                                <div>
                                                    <strong>{student.first_name} {student.last_name}</strong>
                                                    <br />
                                                    <small className="text-muted">{student.username} - {student.email}</small>
                                                </div>
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    onClick={() => handleEnrollStudent(student.id)}
                                                >
                                                    <i className="fas fa-plus me-1"></i>
                                                    Enroll
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEnrollModal(false)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassManagement; 