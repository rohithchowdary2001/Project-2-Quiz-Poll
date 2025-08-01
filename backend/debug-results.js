const database = require('./src/config/database');

async function debugQuizResults() {
    const quizId = 44;
    
    console.log('=== DEBUGGING QUIZ RESULTS ===');
    console.log('Quiz ID:', quizId);
    
    // 1. Check completed submissions
    console.log('\n1. COMPLETED SUBMISSIONS:');
    const submissions = await database.query(`
        SELECT qs.id, qs.student_id, qs.is_completed, qs.submitted_at, u.username
        FROM quiz_submissions qs 
        JOIN users u ON qs.student_id = u.id 
        WHERE qs.quiz_id = ? AND qs.is_completed = true
        ORDER BY qs.submitted_at DESC
    `, [quizId]);
    
    submissions.forEach(s => {
        console.log(`  Submission ${s.id}: User ${s.username} (${s.student_id}) - Completed: ${s.is_completed} - Submitted: ${s.submitted_at}`);
    });
    
    // 2. Check all student answers for these submissions
    console.log('\n2. STUDENT ANSWERS:');
    const answers = await database.query(`
        SELECT sa.*, q.question_order, q.question_text, ao.option_text, ao.is_correct
        FROM student_answers sa
        JOIN questions q ON sa.question_id = q.id
        JOIN answer_options ao ON sa.selected_option_id = ao.id
        WHERE sa.submission_id IN (${submissions.map(s => s.id).join(',')})
        ORDER BY sa.submission_id, q.question_order
    `);
    
    answers.forEach(a => {
        console.log(`  Sub ${a.submission_id}: Q${a.question_order} (${a.question_id}) -> Option ${a.selected_option_id} "${a.option_text}" ${a.is_correct ? '✅' : '❌'}`);
    });
    
    // 3. Test the same query used in getQuizResults
    console.log('\n3. ANSWER STATISTICS QUERY (Same as API):');
    const answerStats = await database.query(`
        SELECT 
            q.id as question_id, q.question_text, q.question_order,
            ao.id as option_id, ao.option_text, ao.is_correct,
            COUNT(sa.id) as selection_count,
            ROUND((COUNT(sa.id) / (SELECT COUNT(*) FROM quiz_submissions WHERE quiz_id = ? AND is_completed = true)) * 100, 2) as percentage
        FROM questions q
        LEFT JOIN answer_options ao ON q.id = ao.question_id
        LEFT JOIN student_answers sa ON ao.id = sa.selected_option_id AND sa.submission_id IN (
            SELECT id FROM quiz_submissions WHERE quiz_id = ? AND is_completed = true
        )
        WHERE q.quiz_id = ?
        GROUP BY q.id, ao.id
        ORDER BY q.question_order, ao.option_order
    `, [quizId, quizId, quizId]);
    
    console.log('Answer Statistics Results:');
    answerStats.forEach(stat => {
        console.log(`  Q${stat.question_order} (${stat.question_id}): Option ${stat.option_id} "${stat.option_text}" - Selected ${stat.selection_count} times (${stat.percentage}%) ${stat.is_correct ? '✅' : '❌'}`);
    });
    
    console.log('\n=== END DEBUG ===');
    process.exit(0);
}

debugQuizResults().catch(console.error);
