import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { toast } from 'react-toastify';
import { api } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const TakeQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);

  // Fetch quiz data
  const { data: quiz, isLoading } = useQuery(
    ['quiz', id],
    () => api.get(`/quizzes/${id}`),
    {
      onSuccess: (data) => {
        setTimeLeft(data.duration * 60); // Convert to seconds
        startSubmission(data.id);
      }
    }
  );

// In startSubmission function:
const startSubmission = async (quizId) => {
  try {
    const response = await api.post('/submissions/start', { quizId });
    setSubmissionId(response.data.submission.id);
    setTimeLeft(response.data.submission.timeRemaining * 60); // convert minutes to seconds
  } catch (error) {
    if (error.response?.status === 409) {
      // Specific message for conflict (quiz already completed)
      toast.error("You have already completed this quiz.");
      navigate('/student/quizzes');
    } else {
      toast.error('Failed to start quiz');
      navigate('/student/quizzes');
    }
  }
};


// In submitAnswerMutation:
const submitAnswerMutation = useMutation(
  (answerData) => api.post('/submissions/submit-answer', answerData),  // changed path
  {
    onError: () => {
      toast.error('Failed to save answer');
    }
  }
);

// In handleAnswerChange:
const handleAnswerChange = (questionId, answer) => {
  setAnswers({
    ...answers,
    [questionId]: answer
  });

  if (submissionId) {
    submitAnswerMutation.mutate({
      submissionId: submissionId,       // camelCase keys
      questionId: questionId,
      selectedOptionId: answer,         // matches backend param name
    });
  }
};

// In completeSubmissionMutation:
const completeSubmissionMutation = useMutation(
  (submissionId) => api.post('/submissions/complete', { submissionId }),  // camelCase key
  {
    onSuccess: () => {
      toast.success('Quiz submitted successfully!');
      navigate('/student/quizzes');
    },
    onError: () => {
      toast.error('Failed to submit quiz');
    }
  }
);


  // Timer effect
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quiz) {
      handleSubmitQuiz();
    }
  }, [timeLeft, quiz]);


  const handleSubmitQuiz = () => {
    if (submissionId) {
      completeSubmissionMutation.mutate(submissionId);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!quiz?.questions) return 0;
    return ((currentQuestion + 1) / quiz.questions.length) * 100;
  };

  if (isLoading) return <LoadingSpinner />;
  if (!quiz) return <div className="alert alert-danger">Quiz not found</div>;

  const currentQuestionData = quiz.questions[currentQuestion];

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-lg-8 offset-lg-2">
          {/* Header */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-0">{quiz.title}</h4>
                  <small className="text-muted">{quiz.class_name}</small>
                </div>
                <div className="text-end">
                  <div className={`badge ${timeLeft < 300 ? 'bg-danger' : 'bg-primary'} fs-6`}>
                    <i className="bi bi-clock me-1"></i>
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <div className="progress">
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
                <div className="d-flex justify-content-between mt-2">
                  <small className="text-muted">
                    Question {currentQuestion + 1} of {quiz.questions.length}
                  </small>
                  <small className="text-muted">
                    {Object.keys(answers).length} answered
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Question Card */}
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">
                Question {currentQuestion + 1}
              </h5>
              <p className="card-text fs-5">
                {currentQuestionData.question_text}
              </p>

              {/* Answer Options */}
              <div className="mt-4">
                {currentQuestionData.question_type === 'multiple_choice' && (
                  <div className="list-group">
                    {currentQuestionData.options.map((option, index) => (
                      <label
                        key={index}
                        className="list-group-item list-group-item-action"
                      >
                        <input
                          type="radio"
                          name={`question_${currentQuestionData.id}`}
                          value={option}
                          checked={answers[currentQuestionData.id] === option}
                          onChange={(e) => handleAnswerChange(currentQuestionData.id, e.target.value)}
                          className="me-2"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestionData.question_type === 'true_false' && (
                  <div className="list-group">
                    <label className="list-group-item list-group-item-action">
                      <input
                        type="radio"
                        name={`question_${currentQuestionData.id}`}
                        value="true"
                        checked={answers[currentQuestionData.id] === 'true'}
                        onChange={(e) => handleAnswerChange(currentQuestionData.id, e.target.value)}
                        className="me-2"
                      />
                      True
                    </label>
                    <label className="list-group-item list-group-item-action">
                      <input
                        type="radio"
                        name={`question_${currentQuestionData.id}`}
                        value="false"
                        checked={answers[currentQuestionData.id] === 'false'}
                        onChange={(e) => handleAnswerChange(currentQuestionData.id, e.target.value)}
                        className="me-2"
                      />
                      False
                    </label>
                  </div>
                )}

                {currentQuestionData.question_type === 'text' && (
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Enter your answer..."
                    value={answers[currentQuestionData.id] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestionData.id, e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="d-flex justify-content-between mb-4">
            <button
              className="btn btn-outline-secondary"
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Previous
            </button>
            
            <div className="d-flex gap-2">
              {currentQuestion < quiz.questions.length - 1 ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                >
                  Next
                  <i className="bi bi-arrow-right ms-2"></i>
                </button>
              ) : (
                <button
                  className="btn btn-success"
                  onClick={() => setShowConfirmModal(true)}
                >
                  <i className="bi bi-check-circle me-2"></i>
                  Submit Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Submit Quiz</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowConfirmModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to submit your quiz?</p>
                <p className="text-muted">
                  You have answered {Object.keys(answers).length} out of {quiz.questions.length} questions.
                </p>
                <p className="text-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleSubmitQuiz}
                  disabled={completeSubmissionMutation.isLoading}
                >
                  {completeSubmissionMutation.isLoading ? 'Submitting...' : 'Submit Quiz'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Backdrop */}
      {showConfirmModal && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
};

export default TakeQuiz; 