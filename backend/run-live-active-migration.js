const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'quiz_management'
};

async function runMigration() {
    let connection;
    
    try {
        // Create database connection
        connection = mysql.createConnection(dbConfig);
        
        console.log('📊 Connecting to database...');
        await new Promise((resolve, reject) => {
            connection.connect((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        console.log('✅ Connected to database successfully');
        
        // Check if is_live_active column exists
        console.log('🔍 Checking if is_live_active column exists...');
        const checkResult = await new Promise((resolve, reject) => {
            connection.query(
                "SHOW COLUMNS FROM quizzes LIKE 'is_live_active'",
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });
        
        if (checkResult.length > 0) {
            console.log('✅ Column is_live_active already exists');
            return;
        }
        
        console.log('➕ Adding is_live_active column to quizzes table...');
        
        // Add the column
        await new Promise((resolve, reject) => {
            connection.query(
                "ALTER TABLE quizzes ADD COLUMN is_live_active BOOLEAN DEFAULT FALSE AFTER is_active",
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });
        
        console.log('✅ Added is_live_active column successfully');
        
        // Update existing quizzes
        console.log('🔄 Updating existing quizzes...');
        await new Promise((resolve, reject) => {
            connection.query(
                "UPDATE quizzes SET is_live_active = FALSE WHERE is_live_active IS NULL",
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });
        
        console.log('✅ Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        if (connection) {
            connection.end();
            console.log('📊 Database connection closed');
        }
    }
}

// Run the migration
runMigration();
