-- Add quiz versioning support
-- This allows editing quizzes while preserving historical data

-- Add version column to quizzes table
ALTER TABLE quizzes ADD COLUMN version INT DEFAULT 1;
ALTER TABLE quizzes ADD COLUMN created_from_version INT DEFAULT NULL;
ALTER TABLE quizzes ADD COLUMN is_current_version BOOLEAN DEFAULT TRUE;

-- Add version tracking to questions and options
ALTER TABLE questions ADD COLUMN quiz_version INT DEFAULT 1;
ALTER TABLE options ADD COLUMN question_version INT DEFAULT 1;

-- Add indexes for performance
CREATE INDEX idx_quizzes_version ON quizzes(id, version);
CREATE INDEX idx_questions_quiz_version ON questions(quiz_id, quiz_version);
CREATE INDEX idx_options_question_version ON options(question_id, question_version);

-- Add constraint to ensure only one current version per quiz
CREATE UNIQUE INDEX idx_quiz_current_version ON quizzes(id, is_current_version) WHERE is_current_version = TRUE;

-- Add table to track which students attempted which version
CREATE TABLE quiz_attempts_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    quiz_id INT NOT NULL,
    quiz_version INT NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_quiz_attempt (student_id, quiz_id)
);
