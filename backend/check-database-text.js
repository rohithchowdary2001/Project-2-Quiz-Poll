const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabase() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'quiz_management'
    });

    try {
        console.log('🔍 Checking questions table...');
        const [questions] = await connection.execute(`
            SELECT id, question_text, quiz_id 
            FROM questions 
            ORDER BY id DESC
            LIMIT 10
        `);
        console.log('📋 Sample Questions:');
        questions.forEach(q => {
            console.log(`  ID: ${q.id}, Quiz: ${q.quiz_id}, Text: "${q.question_text}"`);
        });

        console.log('\n🔍 Checking answer_options table...');
        const [options] = await connection.execute(`
            SELECT ao.id, ao.option_text, ao.question_id, ao.is_correct
            FROM answer_options ao
            ORDER BY ao.id DESC
            LIMIT 20
        `);
        console.log('📋 Sample Options:');
        options.forEach(opt => {
            console.log(`  ID: ${opt.id}, Q: ${opt.question_id}, Text: "${opt.option_text}", Correct: ${opt.is_correct}`);
        });

        console.log('\n🔍 Checking student_answers table structure...');
        const [structure] = await connection.execute(`
            DESCRIBE student_answers
        `);
        console.log('📋 student_answers table structure:');
        structure.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });

        console.log('\n🔍 Checking student_answers with correct columns...');
        const [studentAnswers] = await connection.execute(`
            SELECT 
                sa.id,
                sa.submission_id,
                sa.question_id,
                sa.selected_option_id,
                qs.student_id,
                q.question_text,
                ao.option_text,
                ao.is_correct
            FROM student_answers sa
            LEFT JOIN quiz_submissions qs ON sa.submission_id = qs.id
            LEFT JOIN questions q ON sa.question_id = q.id
            LEFT JOIN answer_options ao ON sa.selected_option_id = ao.id
            LIMIT 10
        `);
        console.log('📋 Student Answers with Text:');
        studentAnswers.forEach(ans => {
            console.log(`  Student: ${ans.student_id}, Q: ${ans.question_id}, Q-Text: "${ans.question_text}", Option: ${ans.selected_option_id}, O-Text: "${ans.option_text}", Correct: ${ans.is_correct}`);
        });

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await connection.end();
    }
}

checkDatabase();
