import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { api } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ClassManagement = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [newClass, setNewClass] = useState({
    name: '',
    description: '',
    code: ''
  });
  const [studentEmail, setStudentEmail] = useState('');
  const queryClient = useQueryClient();

  // Fetch classes
  const { data: classes, isLoading, error } = useQuery(
    'professor-classes',
    () => api.get('/classes'),
    {
      onError: (error) => {
        toast.error('Failed to fetch classes');
      }
    }
  );

  // Create class mutation
  const createClassMutation = useMutation(
    (classData) => api.post('/classes', classData),
    {
      onSuccess: () => {
        toast.success('Class created successfully');
        setShowCreateModal(false);
        setNewClass({ name: '', description: '', code: '' });
        queryClient.invalidateQueries('professor-classes');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create class');
      }
    }
  );

  // Delete class mutation
  const deleteClassMutation = useMutation(
    (classId) => api.delete(`/classes/${classId}`),
    {
      onSuccess: () => {
        toast.success('Class deleted successfully');
        queryClient.invalidateQueries('professor-classes');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete class');
      }
    }
  );

  // Add student mutation
  const addStudentMutation = useMutation(
    ({ classId, email }) => api.post(`/classes/${classId}/students`, { email }),
    {
      onSuccess: () => {
        toast.success('Student added successfully');
        setShowStudentModal(false);
        setStudentEmail('');
        queryClient.invalidateQueries('professor-classes');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to add student');
      }
    }
  );

  // Remove student mutation
  const removeStudentMutation = useMutation(
    ({ classId, studentId }) => api.delete(`/classes/${classId}/students/${studentId}`),
    {
      onSuccess: () => {
        toast.success('Student removed successfully');
        queryClient.invalidateQueries('professor-classes');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to remove student');
      }
    }
  );

  const handleCreateClass = (e) => {
    e.preventDefault();
    createClassMutation.mutate(newClass);
  };

  const handleDeleteClass = (classId) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      deleteClassMutation.mutate(classId);
    }
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    addStudentMutation.mutate({ classId: selectedClass.id, email: studentEmail });
  };

  const handleRemoveStudent = (studentId) => {
    if (window.confirm('Are you sure you want to remove this student?')) {
      removeStudentMutation.mutate({ classId: selectedClass.id, studentId });
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="alert alert-danger">Error loading classes</div>;

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Class Management</h1>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Create New Class
            </button>
          </div>

          {/* Classes Grid */}
          <div className="row">
            {classes?.map((classItem) => (
              <div key={classItem.id} className="col-md-6 col-lg-4 mb-4">
                <div className="card h-100">
                  <div className="card-header">
                    <h5 className="card-title mb-0">{classItem.name}</h5>
                    <small className="text-muted">Code: {classItem.code}</small>
                  </div>
                  <div className="card-body">
                    <p className="card-text">{classItem.description}</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        {classItem.students_count || 0} students
                      </small>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => {
                            setSelectedClass(classItem);
                            setShowStudentModal(true);
                          }}
                        >
                          <i className="bi bi-people"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteClass(classItem.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {classes?.length === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-mortarboard-fill display-1 text-muted"></i>
              <h3 className="mt-3">No classes yet</h3>
              <p className="text-muted">Create your first class to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Class</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateClass}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Class Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newClass.name}
                      onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Class Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newClass.code}
                      onChange={(e) => setNewClass({...newClass, code: e.target.value})}
                      placeholder="e.g., CS101"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={newClass.description}
                      onChange={(e) => setNewClass({...newClass, description: e.target.value})}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createClassMutation.isLoading}
                  >
                    {createClassMutation.isLoading ? 'Creating...' : 'Create Class'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Student Management Modal */}
      {showStudentModal && selectedClass && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Manage Students - {selectedClass.name}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowStudentModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Add Student Form */}
                <form onSubmit={handleAddStudent} className="mb-4">
                  <div className="row">
                    <div className="col-md-8">
                      <input
                        type="email"
                        className="form-control"
                        placeholder="Student email address"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={addStudentMutation.isLoading}
                      >
                        {addStudentMutation.isLoading ? 'Adding...' : 'Add Student'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Students List */}
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedClass.students?.map((student) => (
                        <tr key={student.id}>
                          <td>{student.name}</td>
                          <td>{student.email}</td>
                          <td>
                            {new Date(student.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRemoveStudent(student.id)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(!selectedClass.students || selectedClass.students.length === 0) && (
                  <div className="text-center py-3">
                    <p className="text-muted">No students enrolled yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Backdrop */}
      {(showCreateModal || showStudentModal) && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
};

export default ClassManagement; 