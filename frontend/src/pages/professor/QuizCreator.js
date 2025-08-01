import React, { useState, useEffect } from 'react';
import axios from '../utils/api';

const QuizManagement = () => {
  const [classes, setClasses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [form, setForm] = useState({
    title: '',
    class_id: '',
    questions: [
      {
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: '',
      },
    ],
  });

  // Fetch classes for dropdown
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await axios.get('/classes');
        setClasses(res.data);
      } catch (err) {
        console.error('Error fetching classes:', err);
      }
    };
    fetchClasses();
  }, []);

  // Fetch quizzes
  const fetchQuizzes = async () => {
    try {
      const res = await axios.get('/quizzes?sortBy=created_at&sortOrder=DESC');
      setQuizzes(res.data);
    } catch (err) {
      console.error('QuizManagement - Error fetching quizzes:', err);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleInputChange = (e, questionIndex = null, optionIndex = null) => {
    const { name, value } = e.target;
    if (questionIndex !== null) {
      const updatedQuestions = [...form.questions];
      if (optionIndex !== null) {
        updatedQuestions[questionIndex].options[optionIndex] = value;
      } else {
        updatedQuestions[questionIndex][name] = value;
      }
      setForm({ ...form, questions: updatedQuestions });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleAddQuestion = () => {
    setForm({
      ...form,
      questions: [...form.questions, { question_text: '', options: ['', '', '', ''], correct_answer: '' }],
    });
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/quizzes', form);
      alert('Quiz created successfully');
      fetchQuizzes();
    } catch (err) {
      console.error('QuizManagement - Error creating quiz:', err);
      alert('Failed to create quiz. Check the form and try again.');
    }
  };

  return (
    <div>
      <h2>Create New Quiz</h2>
      <form onSubmit={handleCreateQuiz}>
        <div>
          <label>Title:</label>
          <input type="text" name="title" value={form.title} onChange={handleInputChange} required />
        </div>

        <div>
          <label>Class:</label>
          <select name="class_id" value={form.class_id} onChange={handleInputChange} required>
            <option value="">-- Select Class --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.title}
              </option>
            ))}
          </select>
        </div>

        {form.questions.map((question, qIdx) => (
          <div key={qIdx}>
            <label>Question {qIdx + 1}:</label>
            <input
              type="text"
              name="question_text"
              value={question.question_text}
              onChange={(e) => handleInputChange(e, qIdx)}
              required
            />
            {question.options.map((opt, oIdx) => (
              <input
                key={oIdx}
                type="text"
                placeholder={`Option ${oIdx + 1}`}
                value={opt}
                onChange={(e) => handleInputChange(e, qIdx, oIdx)}
                required
              />
            ))}
            <select
              name="correct_answer"
              value={question.correct_answer}
              onChange={(e) => handleInputChange(e, qIdx)}
              required
            >
              <option value="">-- Select Correct Answer --</option>
              {question.options.map((opt, oIdx) => (
                <option key={oIdx} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}

        <button type="button" onClick={handleAddQuestion}>
          + Add Question
        </button>
        <button type="submit">Create Quiz</button>
      </form>
    </div>
  );
};

export default QuizManagement;
