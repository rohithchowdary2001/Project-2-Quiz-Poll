-- Quiz Management System Database Schema

-- Create Database
CREATE DATABASE IF NOT EXISTS quiz_management;
USE quiz_management;

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role ENUM('admin', 'professor', 'student') DEFAULT 'student',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_role (role)
);

-- Classes Table
CREATE TABLE classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    class_code VARCHAR(20) UNIQUE NOT NULL,
    professor_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_professor (professor_id),
    INDEX idx_class_code (class_code)
);

-- Student-Class Relationship (Many-to-Many)
CREATE TABLE class_enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    student_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (class_id, student_id),
    INDEX idx_class (class_id),
    INDEX idx_student (student_id)
);

-- Quizzes Table
CREATE TABLE quizzes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    class_id INT NOT NULL,
    professor_id INT NOT NULL,
    deadline DATETIME,
    time_limit_minutes INT DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    allow_multiple_attempts BOOLEAN DEFAULT FALSE,
    show_results_after_submission BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_class (class_id),
    INDEX idx_professor (professor_id),
    INDEX idx_deadline (deadline)
);

-- Questions Table
CREATE TABLE questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('multiple_choice', 'single_choice', 'true_false') DEFAULT 'single_choice',
    question_order INT NOT NULL,
    points INT DEFAULT 1,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    INDEX idx_quiz (quiz_id),
    INDEX idx_order (quiz_id, question_order)
);

-- Answer Options Table
CREATE TABLE answer_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    option_text TEXT NOT NULL,
    option_order INT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    INDEX idx_question (question_id),
    INDEX idx_order (question_id, option_order)
);

-- Quiz Submissions Table
CREATE TABLE quiz_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    student_id INT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    time_taken_minutes INT,
    total_score INT DEFAULT 0,
    max_score INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_submission (quiz_id, student_id),
    INDEX idx_quiz (quiz_id),
    INDEX idx_student (student_id),
    INDEX idx_submitted_at (submitted_at)
);

-- Student Answers Table
CREATE TABLE student_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_option_id INT,
    answer_text TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES quiz_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (selected_option_id) REFERENCES answer_options(id) ON DELETE SET NULL,
    UNIQUE KEY unique_answer (submission_id, question_id),
    INDEX idx_submission (submission_id),
    INDEX idx_question (question_id),
    INDEX idx_option (selected_option_id)
);

-- Quiz Templates (for reusing quizzes)
CREATE TABLE quiz_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    original_quiz_id INT NOT NULL,
    professor_id INT NOT NULL,
    template_name VARCHAR(200) NOT NULL,
    template_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (original_quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_professor (professor_id),
    INDEX idx_original_quiz (original_quiz_id)
);

-- System Settings Table
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Audit Log Table
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_table (table_name),
    INDEX idx_created_at (created_at)
);

-- Create Views for Common Queries

-- View: Class Statistics
CREATE VIEW class_statistics AS
SELECT 
    c.id,
    c.name,
    c.class_code,
    u.first_name AS professor_first_name,
    u.last_name AS professor_last_name,
    COUNT(DISTINCT ce.student_id) AS total_students,
    COUNT(DISTINCT q.id) AS total_quizzes,
    c.created_at
FROM classes c
JOIN users u ON c.professor_id = u.id
LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = TRUE
LEFT JOIN quizzes q ON c.id = q.class_id AND q.is_active = TRUE
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.class_code, u.first_name, u.last_name, c.created_at;

-- View: Quiz Results Summary
CREATE VIEW quiz_results_summary AS
SELECT 
    q.id AS quiz_id,
    q.title AS quiz_title,
    c.name AS class_name,
    COUNT(DISTINCT qs.student_id) AS total_submissions,
    AVG(qs.total_score) AS average_score,
    MAX(qs.total_score) AS highest_score,
    MIN(qs.total_score) AS lowest_score,
    COUNT(DISTINCT ce.student_id) AS total_enrolled,
    q.deadline,
    q.created_at
FROM quizzes q
JOIN classes c ON q.class_id = c.id
LEFT JOIN quiz_submissions qs ON q.id = qs.quiz_id AND qs.is_completed = TRUE
LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.is_active = TRUE
WHERE q.is_active = TRUE
GROUP BY q.id, q.title, c.name, q.deadline, q.created_at;

-- View: Student Progress
CREATE VIEW student_progress AS
SELECT 
    u.id AS student_id,
    u.username,
    u.first_name,
    u.last_name,
    c.id AS class_id,
    c.name AS class_name,
    COUNT(DISTINCT q.id) AS total_quizzes,
    COUNT(DISTINCT qs.id) AS completed_quizzes,
    AVG(qs.total_score) AS average_score,
    MAX(qs.submitted_at) AS last_submission
FROM users u
JOIN class_enrollments ce ON u.id = ce.student_id AND ce.is_active = TRUE
JOIN classes c ON ce.class_id = c.id AND c.is_active = TRUE
LEFT JOIN quizzes q ON c.id = q.class_id AND q.is_active = TRUE
LEFT JOIN quiz_submissions qs ON q.id = qs.quiz_id AND u.id = qs.student_id AND qs.is_completed = TRUE
WHERE u.role = 'student' AND u.is_active = TRUE
GROUP BY u.id, u.username, u.first_name, u.last_name, c.id, c.name;

-- Insert Default System Settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('max_quiz_time_minutes', '120', 'Maximum time limit for quizzes in minutes'),
('max_questions_per_quiz', '50', 'Maximum number of questions allowed per quiz'),
('allow_late_submissions', 'false', 'Whether to allow submissions after deadline'),
('default_quiz_time_limit', '30', 'Default time limit for new quizzes in minutes'),
('system_maintenance_mode', 'false', 'Enable maintenance mode');

-- Create Indexes for Performance
CREATE INDEX idx_users_role_active ON users(role, is_active);
CREATE INDEX idx_classes_professor_active ON classes(professor_id, is_active);
CREATE INDEX idx_quizzes_class_active ON quizzes(class_id, is_active);
CREATE INDEX idx_submissions_quiz_completed ON quiz_submissions(quiz_id, is_completed);
CREATE INDEX idx_quiz_deadline_active ON quizzes(deadline, is_active);
CREATE INDEX idx_enrollments_student_active ON class_enrollments(student_id, is_active); 