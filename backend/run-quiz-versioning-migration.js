const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

const runMigration = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'quiz_poll_db'
    });

    try {
        console.log('🔄 Running Quiz Versioning Migration...');

        // Check if columns already exist to prevent errors
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'quizzes' AND COLUMN_NAME IN ('version', 'created_from_version', 'is_current_version')
        `, [process.env.DB_NAME || 'quiz_poll_db']);

        if (columns.length === 0) {
            // Add version columns to quizzes table
            console.log('📝 Adding version columns to quizzes table...');
            await connection.execute(`
                ALTER TABLE quizzes 
                ADD COLUMN version INT DEFAULT 1,
                ADD COLUMN created_from_version INT DEFAULT NULL,
                ADD COLUMN is_current_version BOOLEAN DEFAULT TRUE
            `);

            // Update existing quizzes to have version 1
            console.log('🔄 Setting existing quizzes to version 1...');
            await connection.execute(`
                UPDATE quizzes SET version = 1, is_current_version = TRUE WHERE version IS NULL
            `);
        } else {
            console.log('✅ Version columns already exist in quizzes table');
        }

        // Check if questions version column exists
        const [questionColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'questions' AND COLUMN_NAME = 'quiz_version'
        `, [process.env.DB_NAME || 'quiz_poll_db']);

        if (questionColumns.length === 0) {
            console.log('📝 Adding version column to questions table...');
            await connection.execute(`
                ALTER TABLE questions 
                ADD COLUMN quiz_version INT DEFAULT 1
            `);

            // Update existing questions
            await connection.execute(`
                UPDATE questions SET quiz_version = 1 WHERE quiz_version IS NULL
            `);
        } else {
            console.log('✅ Version column already exists in questions table');
        }

        // Check if options version column exists
        const [optionColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'answer_options' AND COLUMN_NAME = 'question_version'
        `, [process.env.DB_NAME || 'quiz_poll_db']);

        if (optionColumns.length === 0) {
            console.log('📝 Adding version column to answer_options table...');
            await connection.execute(`
                ALTER TABLE answer_options 
                ADD COLUMN question_version INT DEFAULT 1
            `);

            // Update existing options
            await connection.execute(`
                UPDATE answer_options SET question_version = 1 WHERE question_version IS NULL
            `);
        } else {
            console.log('✅ Version column already exists in answer_options table');
        }

        // Check if quiz_attempts_versions table exists
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'quiz_attempts_versions'
        `, [process.env.DB_NAME || 'quiz_poll_db']);

        if (tables.length === 0) {
            console.log('📝 Creating quiz_attempts_versions table...');
            await connection.execute(`
                CREATE TABLE quiz_attempts_versions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    quiz_id INT NOT NULL,
                    quiz_version INT NOT NULL,
                    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_student_quiz_attempt (student_id, quiz_id)
                )
            `);
        } else {
            console.log('✅ quiz_attempts_versions table already exists');
        }

        // Add indexes for performance
        console.log('📝 Adding performance indexes...');
        try {
            await connection.execute(`
                CREATE INDEX IF NOT EXISTS idx_quizzes_version ON quizzes(id, version)
            `);
            await connection.execute(`
                CREATE INDEX IF NOT EXISTS idx_questions_quiz_version ON questions(quiz_id, quiz_version)
            `);
            await connection.execute(`
                CREATE INDEX IF NOT EXISTS idx_options_question_version ON answer_options(question_id, question_version)
            `);
            
            // Add unique constraint for current version (only one current version per quiz)
            await connection.execute(`
                CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_current_version 
                ON quizzes(id, is_current_version) 
                WHERE is_current_version = TRUE
            `);
        } catch (indexError) {
            console.log('⚠️  Some indexes may already exist:', indexError.message);
        }

        console.log('✅ Quiz Versioning Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await connection.end();
    }
};

// Run migration if called directly
if (require.main === module) {
    runMigration().catch(console.error);
}

module.exports = runMigration;
