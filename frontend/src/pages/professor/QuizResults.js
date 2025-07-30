import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, endpoints, apiUtils } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

const QuizResults = () => {
  const { id } = useParams();
  const [quizData, setQuizData] = useState(null);
  const [results, setResults] = useState([]);
  const [answerStatistics, setAnswerStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchQuizResults();
  }, [id]);

  const fetchQuizResults = async () => {
    try {
      setLoading(true);
      const response = await api.get(endpoints.quizzes.results(id));
      setQuizData(response.quiz);
      setResults(response.results);
      setAnswerStatistics(response.answerStatistics);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      
      // Prepare CSV data
      const csvData = results.map(result => ({
        'Student Name': result.studentName,
        'Student Email': result.studentEmail,
        'Score': result.totalScore,
        'Max Score': result.maxScore,
        'Percentage': result.percentage + '%',
        'Time Taken (minutes)': result.timeTakenMinutes,
        'Started At': new Date(result.startedAt).toLocaleString(),
        'Submitted At': new Date(result.submittedAt).toLocaleString(),
        'Status': result.isCompleted ? 'Completed' : 'In Progress'
      }));

      // Convert to CSV format
      const csvContent = convertToCSV(csvData);
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quizData.title}_results_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Quiz results exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export quiz results');
    } finally {
      setExporting(false);
    }
  };

  const convertToCSV = (data) => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in values
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  const sortResults = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortedResults = () => {
    return [...results].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle different data types
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return 'bi-arrow-down-up';
    return sortOrder === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down';
  };

  const getPerformanceColor = (percentage) => {
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-warning';
    return 'text-danger';
  };

  if (loading) return <LoadingSpinner text="Loading quiz results..." />;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  const averageScore = results.length > 0 ? 
    (results.reduce((sum, result) => sum + result.percentage, 0) / results.length).toFixed(1) : 0;
  
  const completionRate = results.length > 0 ? 
    ((results.filter(result => result.isCompleted).length / results.length) * 100).toFixed(1) : 0;

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-0">Quiz Results: {quizData?.title}</h1>
              <p className="text-muted">Detailed performance analysis and statistics</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="btn btn-success"
              disabled={exporting || results.length === 0}
            >
              {exporting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Exporting...
                </>
              ) : (
                <>
                  <i className="bi bi-download me-2"></i>
                  Export CSV
                </>
              )}
            </button>
          </div>

          {/* Summary Statistics */}
          <div className="row mb-4">
            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-primary shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Total Submissions
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {quizData?.totalSubmissions || 0}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-clipboard-check text-primary" style={{ fontSize: '2rem' }}></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-success shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                        Average Score
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {averageScore}%
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-trophy text-success" style={{ fontSize: '2rem' }}></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-info shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                        Completion Rate
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {completionRate}%
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-percent text-info" style={{ fontSize: '2rem' }}></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-warning shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                        Highest Score
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">
                        {results.length > 0 ? Math.max(...results.map(r => r.percentage)) : 0}%
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-star text-warning" style={{ fontSize: '2rem' }}></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Student Results</h6>
            </div>
            <div className="card-body">
              {results.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th 
                          className="sortable" 
                          onClick={() => sortResults('studentName')}
                          style={{ cursor: 'pointer' }}
                        >
                          Student Name <i className={`bi ${getSortIcon('studentName')}`}></i>
                        </th>
                        <th>Email</th>
                        <th 
                          className="sortable" 
                          onClick={() => sortResults('percentage')}
                          style={{ cursor: 'pointer' }}
                        >
                          Score <i className={`bi ${getSortIcon('percentage')}`}></i>
                        </th>
                        <th 
                          className="sortable" 
                          onClick={() => sortResults('timeTakenMinutes')}
                          style={{ cursor: 'pointer' }}
                        >
                          Time Taken <i className={`bi ${getSortIcon('timeTakenMinutes')}`}></i>
                        </th>
                        <th 
                          className="sortable" 
                          onClick={() => sortResults('submittedAt')}
                          style={{ cursor: 'pointer' }}
                        >
                          Submitted At <i className={`bi ${getSortIcon('submittedAt')}`}></i>
                        </th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedResults().map((result, index) => (
                        <tr key={index}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3" 
                                   style={{ width: '32px', height: '32px' }}>
                                {result.studentName.charAt(0).toUpperCase()}
                              </div>
                              {result.studentName}
                            </div>
                          </td>
                          <td>{result.studentEmail}</td>
                          <td>
                            <span className={`fw-bold ${getPerformanceColor(result.percentage)}`}>
                              {result.percentage}%
                            </span>
                            <div className="small text-muted">
                              {result.totalScore}/{result.maxScore} points
                            </div>
                          </td>
                          <td>{result.timeTakenMinutes} minutes</td>
                          <td>{new Date(result.submittedAt).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${result.isCompleted ? 'bg-success' : 'bg-warning'}`}>
                              {result.isCompleted ? 'Completed' : 'In Progress'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-clipboard-x text-muted mb-3" style={{ fontSize: '3rem' }}></i>
                  <p className="text-muted">No submissions yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Answer Statistics */}
          {answerStatistics.length > 0 && (
            <div className="card shadow">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">Answer Statistics</h6>
              </div>
              <div className="card-body">
                <div className="accordion" id="questionAccordion">
                  {answerStatistics.reduce((acc, stat) => {
                    const existingQuestion = acc.find(q => q.questionId === stat.question_id);
                    if (existingQuestion) {
                      existingQuestion.options.push(stat);
                    } else {
                      acc.push({
                        questionId: stat.question_id,
                        questionText: stat.question_text,
                        questionOrder: stat.question_order,
                        options: [stat]
                      });
                    }
                    return acc;
                  }, []).map((question, index) => (
                    <div key={question.questionId} className="accordion-item">
                      <h2 className="accordion-header" id={`heading${index}`}>
                        <button
                          className="accordion-button collapsed"
                          type="button"
                          data-bs-toggle="collapse"
                          data-bs-target={`#collapse${index}`}
                          aria-expanded="false"
                          aria-controls={`collapse${index}`}
                        >
                          Question {question.questionOrder}: {question.questionText}
                        </button>
                      </h2>
                      <div
                        id={`collapse${index}`}
                        className="accordion-collapse collapse"
                        aria-labelledby={`heading${index}`}
                        data-bs-parent="#questionAccordion"
                      >
                        <div className="accordion-body">
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className="mb-2">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className={option.is_correct ? 'fw-bold text-success' : ''}>
                                  {option.option_text}
                                  {option.is_correct && <i className="bi bi-check-circle-fill text-success ms-2"></i>}
                                </span>
                                <span className="text-muted">
                                  {option.selection_count} selections ({option.percentage}%)
                                </span>
                              </div>
                              <div className="progress" style={{ height: '8px' }}>
                                <div 
                                  className={`progress-bar ${option.is_correct ? 'bg-success' : 'bg-primary'}`}
                                  style={{ width: `${option.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizResults; 