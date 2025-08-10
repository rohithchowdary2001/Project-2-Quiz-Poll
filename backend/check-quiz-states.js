const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'quiz_management'
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Error connecting:', err);
        return;
    }
    
    console.log('✅ Connected to database');
    
    // Check current quiz states
    connection.query('SELECT id, title, is_active, is_live_active FROM quizzes ORDER BY id', (err, results) => {
        if (err) {
            console.error('❌ Query error:', err);
            return;
        }
        
        console.log('📊 Current quiz states:');
        console.table(results);
        
        connection.end();
    });
});
