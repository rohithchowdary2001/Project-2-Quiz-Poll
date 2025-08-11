const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSpecificQuestions() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'quiz_management'
    });

    try {
        console.log('🔍 Checking questions 32, 33, 34...');
        const [questions] = await connection.execute(`
            SELECT id, question_text, quiz_id 
            FROM questions 
            WHERE id IN (32, 33, 34)
        `);
        console.log('📋 Questions 32-34:');
        questions.forEach(q => {
            console.log(`  ID: ${q.id}, Quiz: ${q.quiz_id}, Text: "${q.question_text}"`);
        });

        console.log('\n🔍 Checking answer_options for questions 32, 33, 34...');
        const [options] = await connection.execute(`
            SELECT id, option_text, question_id, is_correct
            FROM answer_options 
            WHERE question_id IN (32, 33, 34)
            ORDER BY question_id, id
        `);
        console.log('📋 Options for Questions 32-34:');
        options.forEach(opt => {
            console.log(`  Q: ${opt.question_id}, ID: ${opt.id}, Text: "${opt.option_text}", Correct: ${opt.is_correct}`);
        });

        console.log('\n🔍 Checking student answers for student ID 19...');
        const [studentAnswers] = await connection.execute(`
            SELECT 
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
            WHERE qs.student_id = 19
            ORDER BY sa.question_id
        `);
        console.log('📋 Student 19 Answers:');
        studentAnswers.forEach(ans => {
            console.log(`  Q: ${ans.question_id}, Q-Text: "${ans.question_text}", Selected: ${ans.selected_option_id}, O-Text: "${ans.option_text}", Correct: ${ans.is_correct}`);
        });

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await connection.end();
    }
}

checkSpecificQuestions();
