const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
require('dotenv').config();

class DatabaseSeeder {
    constructor() {
        this.connection = mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: 'quiz_management'
        });
    }

    async seed() {
        try {
            console.log('🌱 Starting database seeding...');
            
            // Clear existing data
            await this.clearData();
            
            // Insert sample data
            await this.insertUsers();
            await this.insertClasses();
            await this.insertEnrollments();
            await this.insertQuizzes();
            await this.insertQuestions();
            await this.insertAnswerOptions();
            await this.insertSampleSubmissions();
            
            console.log('✅ Database seeding completed successfully!');
            console.log('🎯 Sample data created:');
            console.log('   - 1 Admin user (admin/password)');
            console.log('   - 3 Professor users (prof1/password, prof2/password, prof3/password)');
            console.log('   - 10 Student users (student1/password through student10/password)');
            console.log('   - 6 Classes with students enrolled');
            console.log('   - 8 Quizzes with multiple questions');
            console.log('   - Sample quiz submissions and results');
            
        } catch (error) {
            console.error('❌ Seeding failed:', error.message);
            process.exit(1);
        } finally {
            this.connection.end();
        }
    }

    async clearData() {
        const tables = [
            'student_answers',
            'quiz_submissions',
            'answer_options',
            'questions',
            'quiz_templates',
            'quizzes',
            'class_enrollments',
            'classes',
            'users',
            'audit_logs'
        ];

        for (const table of tables) {
            await this.executeQuery(`DELETE FROM ${table}`);
        }
        
        // Reset auto increment
        for (const table of tables) {
            await this.executeQuery(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
        }
        
        console.log('🧹 Cleared existing data');
    }

    async insertUsers() {
        const hashedPassword = await bcrypt.hash('password', 10);
        
        const users = [
            // Admin
            {
                username: 'admin',
                email: 'admin@quiz.com',
                password_hash: hashedPassword,
                first_name: 'System',
                last_name: 'Administrator',
                role: 'admin'
            },
            // Professors
            {
                username: 'prof1',
                email: 'prof1@quiz.com',
                password_hash: hashedPassword,
                first_name: 'John',
                last_name: 'Smith',
                role: 'professor'
            },
            {
                username: 'prof2',
                email: 'prof2@quiz.com',
                password_hash: hashedPassword,
                first_name: 'Sarah',
                last_name: 'Johnson',
                role: 'professor'
            },
            {
                username: 'prof3',
                email: 'prof3@quiz.com',
                password_hash: hashedPassword,
                first_name: 'Michael',
                last_name: 'Brown',
                role: 'professor'
            },
            // Students
            ...Array.from({ length: 10 }, (_, i) => ({
                username: `student${i + 1}`,
                email: `student${i + 1}@quiz.com`,
                password_hash: hashedPassword,
                first_name: `Student${i + 1}`,
                last_name: `User`,
                role: 'student'
            }))
        ];

        for (const user of users) {
            await this.executeQuery(
                `INSERT INTO users (username, email, password_hash, first_name, last_name, role) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [user.username, user.email, user.password_hash, user.first_name, user.last_name, user.role]
            );
        }
        
        console.log('👥 Inserted sample users');
    }

    async insertClasses() {
        const classes = [
            { name: 'Introduction to Computer Science', description: 'Basic concepts of programming', professor_id: 2, class_code: 'CS101' },
            { name: 'Data Structures', description: 'Advanced data structures and algorithms', professor_id: 2, class_code: 'CS201' },
            { name: 'Database Systems', description: 'Relational database design and SQL', professor_id: 3, class_code: 'CS301' },
            { name: 'Web Development', description: 'Frontend and backend web technologies', professor_id: 3, class_code: 'CS401' },
            { name: 'Machine Learning', description: 'Introduction to ML algorithms', professor_id: 4, class_code: 'CS501' },
            { name: 'Software Engineering', description: 'Software development methodologies', professor_id: 4, class_code: 'CS601' }
        ];

        for (const cls of classes) {
            await this.executeQuery(
                `INSERT INTO classes (name, description, professor_id, class_code) 
                 VALUES (?, ?, ?, ?)`,
                [cls.name, cls.description, cls.professor_id, cls.class_code]
            );
        }
        
        console.log('🏫 Inserted sample classes');
    }

    async insertEnrollments() {
        // Enroll students in classes (random distribution)
        const enrollments = [
            // CS101 - 8 students
            { class_id: 1, student_id: 5 }, { class_id: 1, student_id: 6 }, { class_id: 1, student_id: 7 },
            { class_id: 1, student_id: 8 }, { class_id: 1, student_id: 9 }, { class_id: 1, student_id: 10 },
            { class_id: 1, student_id: 11 }, { class_id: 1, student_id: 12 },
            
            // CS201 - 6 students
            { class_id: 2, student_id: 7 }, { class_id: 2, student_id: 8 }, { class_id: 2, student_id: 9 },
            { class_id: 2, student_id: 10 }, { class_id: 2, student_id: 11 }, { class_id: 2, student_id: 12 },
            
            // CS301 - 6 students
            { class_id: 3, student_id: 5 }, { class_id: 3, student_id: 6 }, { class_id: 3, student_id: 9 },
            { class_id: 3, student_id: 10 }, { class_id: 3, student_id: 13 }, { class_id: 3, student_id: 14 },
            
            // CS401 - 5 students
            { class_id: 4, student_id: 8 }, { class_id: 4, student_id: 11 }, { class_id: 4, student_id: 12 },
            { class_id: 4, student_id: 13 }, { class_id: 4, student_id: 14 },
            
            // CS501 - 4 students
            { class_id: 5, student_id: 10 }, { class_id: 5, student_id: 11 }, { class_id: 5, student_id: 12 },
            { class_id: 5, student_id: 13 },
            
            // CS601 - 6 students
            { class_id: 6, student_id: 6 }, { class_id: 6, student_id: 9 }, { class_id: 6, student_id: 10 },
            { class_id: 6, student_id: 12 }, { class_id: 6, student_id: 14 }, { class_id: 6, student_id: 8 }
        ];

        for (const enrollment of enrollments) {
            await this.executeQuery(
                `INSERT INTO class_enrollments (class_id, student_id) VALUES (?, ?)`,
                [enrollment.class_id, enrollment.student_id]
            );
        }
        
        console.log('📚 Inserted class enrollments');
    }

    async insertQuizzes() {
        const quizzes = [
            { title: 'Programming Basics Quiz', description: 'Test your understanding of basic programming concepts', class_id: 1, professor_id: 2, deadline: '2024-12-31 23:59:59', time_limit_minutes: 30 },
            { title: 'Variables and Data Types', description: 'Quiz on variables, data types, and operators', class_id: 1, professor_id: 2, deadline: '2024-12-25 23:59:59', time_limit_minutes: 20 },
            { title: 'Arrays and Loops', description: 'Understanding arrays and control structures', class_id: 2, professor_id: 2, deadline: '2024-12-30 23:59:59', time_limit_minutes: 45 },
            { title: 'Binary Trees', description: 'Tree data structures and algorithms', class_id: 2, professor_id: 2, deadline: '2024-12-28 23:59:59', time_limit_minutes: 60 },
            { title: 'SQL Basics', description: 'Basic SQL queries and database operations', class_id: 3, professor_id: 3, deadline: '2024-12-29 23:59:59', time_limit_minutes: 40 },
            { title: 'Database Normalization', description: 'Understanding database normalization forms', class_id: 3, professor_id: 3, deadline: '2024-12-27 23:59:59', time_limit_minutes: 35 },
            { title: 'HTML & CSS Fundamentals', description: 'Basic web technologies quiz', class_id: 4, professor_id: 3, deadline: '2024-12-26 23:59:59', time_limit_minutes: 25 },
            { title: 'JavaScript Basics', description: 'Introduction to JavaScript programming', class_id: 4, professor_id: 3, deadline: '2024-12-31 23:59:59', time_limit_minutes: 50 }
        ];

        for (const quiz of quizzes) {
            await this.executeQuery(
                `INSERT INTO quizzes (title, description, class_id, professor_id, deadline, time_limit_minutes) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [quiz.title, quiz.description, quiz.class_id, quiz.professor_id, quiz.deadline, quiz.time_limit_minutes]
            );
        }
        
        console.log('📝 Inserted sample quizzes');
    }

    async insertQuestions() {
        const questions = [
            // Quiz 1: Programming Basics
            { quiz_id: 1, question_text: 'What is the correct way to declare a variable in JavaScript?', question_order: 1 },
            { quiz_id: 1, question_text: 'Which of the following is a programming paradigm?', question_order: 2 },
            { quiz_id: 1, question_text: 'What does HTML stand for?', question_order: 3 },
            
            // Quiz 2: Variables and Data Types
            { quiz_id: 2, question_text: 'Which data type is used to store true/false values?', question_order: 1 },
            { quiz_id: 2, question_text: 'What is the result of 5 + "3" in JavaScript?', question_order: 2 },
            
            // Quiz 3: Arrays and Loops
            { quiz_id: 3, question_text: 'How do you access the first element of an array?', question_order: 1 },
            { quiz_id: 3, question_text: 'Which loop is guaranteed to execute at least once?', question_order: 2 },
            { quiz_id: 3, question_text: 'What is the time complexity of accessing an array element by index?', question_order: 3 },
            
            // Quiz 4: Binary Trees
            { quiz_id: 4, question_text: 'What is the maximum number of nodes in a binary tree of height h?', question_order: 1 },
            { quiz_id: 4, question_text: 'In which traversal method do we visit the root node first?', question_order: 2 },
            
            // Quiz 5: SQL Basics
            { quiz_id: 5, question_text: 'Which SQL statement is used to retrieve data from a database?', question_order: 1 },
            { quiz_id: 5, question_text: 'What does the WHERE clause do in SQL?', question_order: 2 },
            { quiz_id: 5, question_text: 'Which SQL function is used to count the number of rows?', question_order: 3 },
            
            // Quiz 6: Database Normalization
            { quiz_id: 6, question_text: 'What is the primary goal of database normalization?', question_order: 1 },
            { quiz_id: 6, question_text: 'Which normal form eliminates transitive dependencies?', question_order: 2 },
            
            // Quiz 7: HTML & CSS
            { quiz_id: 7, question_text: 'Which HTML tag is used to create a hyperlink?', question_order: 1 },
            { quiz_id: 7, question_text: 'What does CSS stand for?', question_order: 2 },
            
            // Quiz 8: JavaScript
            { quiz_id: 8, question_text: 'Which method is used to add an element to the end of an array?', question_order: 1 },
            { quiz_id: 8, question_text: 'What is the correct way to write a JavaScript function?', question_order: 2 }
        ];

        for (const question of questions) {
            await this.executeQuery(
                `INSERT INTO questions (quiz_id, question_text, question_order) 
                 VALUES (?, ?, ?)`,
                [question.quiz_id, question.question_text, question.question_order]
            );
        }
        
        console.log('❓ Inserted sample questions');
    }

    async insertAnswerOptions() {
        const options = [
            // Question 1: JavaScript variable declaration
            { question_id: 1, option_text: 'var x = 5;', option_order: 1, is_correct: true },
            { question_id: 1, option_text: 'variable x = 5;', option_order: 2, is_correct: false },
            { question_id: 1, option_text: 'v x = 5;', option_order: 3, is_correct: false },
            { question_id: 1, option_text: 'x := 5;', option_order: 4, is_correct: false },
            
            // Question 2: Programming paradigms
            { question_id: 2, option_text: 'Object-Oriented Programming', option_order: 1, is_correct: true },
            { question_id: 2, option_text: 'Database Management', option_order: 2, is_correct: false },
            { question_id: 2, option_text: 'Web Design', option_order: 3, is_correct: false },
            { question_id: 2, option_text: 'Network Security', option_order: 4, is_correct: false },
            
            // Question 3: HTML
            { question_id: 3, option_text: 'HyperText Markup Language', option_order: 1, is_correct: true },
            { question_id: 3, option_text: 'High Tech Modern Language', option_order: 2, is_correct: false },
            { question_id: 3, option_text: 'Home Tool Markup Language', option_order: 3, is_correct: false },
            { question_id: 3, option_text: 'Hyperlink and Text Markup Language', option_order: 4, is_correct: false },
            
            // Question 4: Boolean data type
            { question_id: 4, option_text: 'boolean', option_order: 1, is_correct: true },
            { question_id: 4, option_text: 'string', option_order: 2, is_correct: false },
            { question_id: 4, option_text: 'number', option_order: 3, is_correct: false },
            { question_id: 4, option_text: 'object', option_order: 4, is_correct: false },
            
            // Question 5: JavaScript type coercion
            { question_id: 5, option_text: '"53"', option_order: 1, is_correct: true },
            { question_id: 5, option_text: '8', option_order: 2, is_correct: false },
            { question_id: 5, option_text: '53', option_order: 3, is_correct: false },
            { question_id: 5, option_text: 'Error', option_order: 4, is_correct: false },
            
            // Continue with more options for other questions...
            // Question 6: Array access
            { question_id: 6, option_text: 'array[0]', option_order: 1, is_correct: true },
            { question_id: 6, option_text: 'array[1]', option_order: 2, is_correct: false },
            { question_id: 6, option_text: 'array.first()', option_order: 3, is_correct: false },
            { question_id: 6, option_text: 'array.get(0)', option_order: 4, is_correct: false },
            
            // Question 7: Loop types
            { question_id: 7, option_text: 'do-while loop', option_order: 1, is_correct: true },
            { question_id: 7, option_text: 'for loop', option_order: 2, is_correct: false },
            { question_id: 7, option_text: 'while loop', option_order: 3, is_correct: false },
            { question_id: 7, option_text: 'foreach loop', option_order: 4, is_correct: false },
            
            // Question 8: Array time complexity
            { question_id: 8, option_text: 'O(1)', option_order: 1, is_correct: true },
            { question_id: 8, option_text: 'O(n)', option_order: 2, is_correct: false },
            { question_id: 8, option_text: 'O(log n)', option_order: 3, is_correct: false },
            { question_id: 8, option_text: 'O(n²)', option_order: 4, is_correct: false },
            
            // Add more options for remaining questions...
            // Question 11: SQL SELECT
            { question_id: 11, option_text: 'SELECT', option_order: 1, is_correct: true },
            { question_id: 11, option_text: 'GET', option_order: 2, is_correct: false },
            { question_id: 11, option_text: 'RETRIEVE', option_order: 3, is_correct: false },
            { question_id: 11, option_text: 'FETCH', option_order: 4, is_correct: false },
            
            // Question 16: HTML hyperlink
            { question_id: 16, option_text: '<a>', option_order: 1, is_correct: true },
            { question_id: 16, option_text: '<link>', option_order: 2, is_correct: false },
            { question_id: 16, option_text: '<href>', option_order: 3, is_correct: false },
            { question_id: 16, option_text: '<url>', option_order: 4, is_correct: false },
            
            // Question 18: JavaScript array method
            { question_id: 18, option_text: 'push()', option_order: 1, is_correct: true },
            { question_id: 18, option_text: 'add()', option_order: 2, is_correct: false },
            { question_id: 18, option_text: 'append()', option_order: 3, is_correct: false },
            { question_id: 18, option_text: 'insert()', option_order: 4, is_correct: false }
        ];

        for (const option of options) {
            await this.executeQuery(
                `INSERT INTO answer_options (question_id, option_text, option_order, is_correct) 
                 VALUES (?, ?, ?, ?)`,
                [option.question_id, option.option_text, option.option_order, option.is_correct]
            );
        }
        
        console.log('🎯 Inserted answer options');
    }

    async insertSampleSubmissions() {
        // Create some sample quiz submissions
        const submissions = [
            { quiz_id: 1, student_id: 5, is_completed: true, total_score: 2, max_score: 3 },
            { quiz_id: 1, student_id: 6, is_completed: true, total_score: 3, max_score: 3 },
            { quiz_id: 1, student_id: 7, is_completed: true, total_score: 1, max_score: 3 },
            { quiz_id: 2, student_id: 5, is_completed: true, total_score: 2, max_score: 2 },
            { quiz_id: 2, student_id: 6, is_completed: true, total_score: 1, max_score: 2 },
            { quiz_id: 5, student_id: 9, is_completed: true, total_score: 3, max_score: 3 },
            { quiz_id: 5, student_id: 10, is_completed: true, total_score: 2, max_score: 3 }
        ];

        for (const submission of submissions) {
            await this.executeQuery(
                `INSERT INTO quiz_submissions (quiz_id, student_id, is_completed, total_score, max_score, submitted_at, time_taken_minutes) 
                 VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
                [submission.quiz_id, submission.student_id, submission.is_completed, submission.total_score, submission.max_score, Math.floor(Math.random() * 30) + 10]
            );
        }
        
        console.log('📊 Inserted sample submissions');
    }

    executeQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.connection.query(query, params, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    }
}

const seeder = new DatabaseSeeder();
seeder.seed().catch(console.error);

module.exports = DatabaseSeeder; 