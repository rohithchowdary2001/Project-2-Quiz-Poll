const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'quiz_management'
};

async function runMigration() {
    let connection;
    
    try {
        console.log('🔄 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        
        console.log('✅ Database connection successful');
        
        // Step 1: Add versioning columns to quizzes table
        console.log('🔄 Adding versioning columns to quizzes table...');
        
        // Check and add columns one by one to avoid errors if they already exist
        const columns = [
            { name: 'version', definition: 'INT DEFAULT 1' },
            { name: 'is_current_version', definition: 'BOOLEAN DEFAULT TRUE' },
            { name: 'created_from_version', definition: 'INT DEFAULT NULL' }
        ];
        
        for (const column of columns) {
            try {
                const checkColumn = `SHOW COLUMNS FROM quizzes LIKE '${column.name}'`;
                const [result] = await connection.execute(checkColumn);
                
                if (result.length === 0) {
                    const addColumnQuery = `ALTER TABLE quizzes ADD COLUMN ${column.name} ${column.definition}`;
                    await connection.execute(addColumnQuery);
                    console.log(`✅ Added column: quizzes.${column.name}`);
                } else {
                    console.log(`ℹ️ Column quizzes.${column.name} already exists`);
                }
            } catch (error) {
                console.log(`⚠️ Issue with column ${column.name}:`, error.message);
            }
        }
        
        console.log('✅ Processed versioning columns for quizzes table');
        
        // Step 2: Add versioning columns to questions table
        console.log('🔄 Adding versioning columns to questions table...');
        
        try {
            const checkQuizVersion = `SHOW COLUMNS FROM questions LIKE 'quiz_version'`;
            const [result] = await connection.execute(checkQuizVersion);
            
            if (result.length === 0) {
                const alterQuestionsQuery = `ALTER TABLE questions ADD COLUMN quiz_version INT DEFAULT 1`;
                await connection.execute(alterQuestionsQuery);
                console.log('✅ Added column: questions.quiz_version');
            } else {
                console.log('ℹ️ Column questions.quiz_version already exists');
            }
        } catch (error) {
            console.log('⚠️ Issue with questions.quiz_version:', error.message);
        }
        
        // Step 3: Add versioning columns to answer_options table
        console.log('🔄 Adding versioning columns to answer_options table...');
        
        try {
            const checkQuestionVersion = `SHOW COLUMNS FROM answer_options LIKE 'question_version'`;
            const [result] = await connection.execute(checkQuestionVersion);
            
            if (result.length === 0) {
                const alterOptionsQuery = `ALTER TABLE answer_options ADD COLUMN question_version INT DEFAULT 1`;
                await connection.execute(alterOptionsQuery);
                console.log('✅ Added column: answer_options.question_version');
            } else {
                console.log('ℹ️ Column answer_options.question_version already exists');
            }
        } catch (error) {
            console.log('⚠️ Issue with answer_options.question_version:', error.message);
        }
        
        // Step 4: Create quiz_attempts_versions table if it doesn't exist
        console.log('🔄 Creating quiz_attempts_versions table...');
        
        const createAttemptsVersionsQuery = `
            CREATE TABLE IF NOT EXISTS quiz_attempts_versions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                quiz_id INT NOT NULL,
                quiz_version INT NOT NULL DEFAULT 1,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
                UNIQUE KEY unique_student_quiz_version (student_id, quiz_id, quiz_version),
                INDEX idx_student_quiz (student_id, quiz_id),
                INDEX idx_quiz_version (quiz_id, quiz_version)
            );
        `;
        
        await connection.execute(createAttemptsVersionsQuery);
        console.log('✅ Created quiz_attempts_versions table');
        
        // Step 5: Update existing data to have default version values
        console.log('🔄 Updating existing quizzes to have version 1...');
        
        await connection.execute('UPDATE quizzes SET version = 1 WHERE version IS NULL');
        await connection.execute('UPDATE quizzes SET is_current_version = TRUE WHERE is_current_version IS NULL');
        await connection.execute('UPDATE questions SET quiz_version = 1 WHERE quiz_version IS NULL');
        await connection.execute('UPDATE answer_options SET question_version = 1 WHERE question_version IS NULL');
        
        console.log('✅ Updated existing data with default version values');
        
        console.log('🎉 Migration completed successfully!');
        console.log('📊 The following columns were added:');
        console.log('   - quizzes.version (INT, default 1)');
        console.log('   - quizzes.is_current_version (BOOLEAN, default TRUE)');
        console.log('   - quizzes.created_from_version (INT, default NULL)');
        console.log('   - questions.quiz_version (INT, default 1)');
        console.log('   - answer_options.question_version (INT, default 1)');
        console.log('📊 The following table was created:');
        console.log('   - quiz_attempts_versions (for tracking student quiz version attempts)');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the migration
console.log('🚀 Starting Quiz Versioning Migration...');
runMigration();
