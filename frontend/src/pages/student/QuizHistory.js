import React, { useEffect, useState } from "react";
import axios from "axios";
import { formatDuration, intervalToDuration } from "date-fns";

function QuizHistory() {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    axios.get("/api/submissions/history")
      .then((res) => {
        setSubmissions(res.data);
      })
      .catch((err) => {
        console.error("Error fetching quiz history:", err);
      });
  }, []);

  const openModal = (submission) => {
    setSelectedSubmission(submission);
  };

  const closeModal = () => {
    setSelectedSubmission(null);
  };

  const formatTime = (minutes) => {
    if (!minutes || minutes <= 0) return "N/A";
    const seconds = minutes * 60;
    const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
    return formatDuration(duration);
  };

  const totalQuizzes = submissions.length;
  const passedQuizzes = submissions.filter(
    (s) => s.max_score && s.total_score >= s.max_score * 0.7
  ).length;
  const avgPercentage = totalQuizzes
    ? Math.round(
        submissions.reduce((acc, s) => {
          if (s.max_score && s.max_score > 0) {
            return acc + (s.total_score / s.max_score) * 100;
          }
          return acc;
        }, 0) / totalQuizzes
      )
    : 0;
  const totalMinutes = submissions.reduce((acc, s) => acc + (s.time_taken_minutes || 0), 0);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Quiz History</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-gray-500 text-sm">Total Quizzes</p>
          <p className="text-2xl font-bold">{totalQuizzes}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-gray-500 text-sm">Passed</p>
          <p className="text-2xl font-bold">{passedQuizzes}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-gray-500 text-sm">Avg. Score</p>
          <p className="text-2xl font-bold">{avgPercentage}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-gray-500 text-sm">Total Time</p>
          <p className="text-2xl font-bold">{formatTime(totalMinutes)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow rounded-xl">
        <table className="min-w-full text-sm text-left table-auto">
          <thead>
            <tr className="bg-gray-100 text-xs uppercase text-gray-600">
              <th className="px-4 py-2">Quiz</th>
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2">Time Taken</th>
              <th className="px-4 py-2">Submitted At</th>
              <th className="px-4 py-2">Percentage</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{submission.quiz_title || "N/A"}</td>
                <td className="px-4 py-2">{submission.class_name || "N/A"}</td>
                <td className="px-4 py-2">
                  {submission.total_score}/{submission.max_score}
                </td>
                <td className="px-4 py-2">
                  {formatTime(submission.time_taken_minutes)}
                </td>
                <td className="px-4 py-2">
                  {submission.submitted_at
                    ? new Date(submission.submitted_at).toLocaleString()
                    : "N/A"}
                </td>
                <td className="px-4 py-2">
                  {submission.max_score > 0
                    ? `${Math.round(
                        (submission.total_score / submission.max_score) * 100
                      )}%`
                    : "0%"}
                </td>
                <td className="px-4 py-2">
                  <button
                    className="text-blue-500 hover:underline"
                    onClick={() => openModal(submission)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Submission Details</h2>
            <p><strong>Quiz:</strong> {selectedSubmission.quiz_title || "N/A"}</p>
            <p><strong>Class:</strong> {selectedSubmission.class_name || "N/A"}</p>
            <p><strong>Status:</strong> {selectedSubmission.status || "Completed"}</p>
            <p>
              <strong>Score:</strong>{" "}
              {selectedSubmission.total_score}/{selectedSubmission.max_score}
            </p>
            <p>
              <strong>Grade:</strong>{" "}
              {selectedSubmission.max_score > 0
                ? `${Math.round(
                    (selectedSubmission.total_score / selectedSubmission.max_score) * 100
                  )}%`
                : "0%"}
            </p>
            <p>
              <strong>Duration:</strong>{" "}
              {formatTime(selectedSubmission.time_taken_minutes)}
            </p>
            <p>
              <strong>Started:</strong>{" "}
              {selectedSubmission.started_at
                ? new Date(selectedSubmission.started_at).toLocaleString()
                : "N/A"}
            </p>
            <p>
              <strong>Submitted:</strong>{" "}
              {selectedSubmission.submitted_at
                ? new Date(selectedSubmission.submitted_at).toLocaleString()
                : "N/A"}
            </p>
            {selectedSubmission.feedback && (
              <p>
                <strong>Feedback:</strong> {selectedSubmission.feedback}
              </p>
            )}
            <div className="mt-4 text-right">
              <button
                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizHistory;
