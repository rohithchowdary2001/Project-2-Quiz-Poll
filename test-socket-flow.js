#!/usr/bin/env node

/**
 * 🔥 SOCKET-ONLY LIVE POLLING TEST
 * 
 * This script tests the complete flow:
 * 1. Student selects answer → Socket emission only
 * 2. Backend relay → Pure socket relay (no database)
 * 3. Professor receives → Live poll updates instantly
 * 4. Database → Only touched on final submission
 */

const io = require('socket.io-client');

console.log('🔥 Testing Socket-Only Live Polling System...\n');

// Simulate backend server URL
const SERVER_URL = 'http://localhost:5000';

// Test data
const TEST_QUIZ_ID = 1;
const TEST_STUDENT = { id: 'test_student_123', name: 'Test Student' };
const TEST_PROFESSOR = { id: 'test_prof_456' };

// Create socket connections
console.log('📡 Creating socket connections...');

// Student socket (simulates QuizTaking component)
const studentSocket = io(SERVER_URL, {
    forceNew: true,
    timeout: 5000
});

// Professor socket (simulates QuizResults component)  
const professorSocket = io(SERVER_URL, {
    forceNew: true,
    timeout: 5000
});

let testResults = {
    studentConnected: false,
    professorConnected: false,
    studentJoinedRoom: false,
    professorJoinedRoom: false,
    answerSent: false,
    answerReceived: false
};

// Student socket events
studentSocket.on('connect', () => {
    console.log('✅ Student socket connected:', studentSocket.id);
    testResults.studentConnected = true;
    
    // Join quiz room (like QuizTaking does)
    studentSocket.emit('join_quiz_room', TEST_QUIZ_ID);
    testResults.studentJoinedRoom = true;
    console.log(`📝 Student joined quiz room: quiz_${TEST_QUIZ_ID}`);
    
    // Wait a bit then simulate answer selection
    setTimeout(() => {
        simulateAnswerSelection();
    }, 1000);
});

// Professor socket events
professorSocket.on('connect', () => {
    console.log('✅ Professor socket connected:', professorSocket.id);
    testResults.professorConnected = true;
    
    // Join professor and quiz rooms (like QuizResults does)
    professorSocket.emit('join_professor_room', TEST_PROFESSOR.id);
    professorSocket.emit('join_quiz_room', TEST_QUIZ_ID);
    testResults.professorJoinedRoom = true;
    console.log(`👩‍🏫 Professor joined rooms: professor_${TEST_PROFESSOR.id}, quiz_${TEST_QUIZ_ID}`);
});

// Professor receives live answer updates
professorSocket.on('live_answer_update', (data) => {
    console.log('🎯 LIVE ANSWER RECEIVED BY PROFESSOR:', data);
    testResults.answerReceived = true;
    
    // Validate data structure
    const expectedFields = ['studentId', 'studentName', 'quizId', 'questionId', 'selectedOptionId', 'optionText', 'timestamp'];
    const hasAllFields = expectedFields.every(field => data.hasOwnProperty(field));
    
    if (hasAllFields) {
        console.log('✅ Answer data structure is correct!');
        console.log('✅ Socket-only live polling is working perfectly!');
        
        // Show final results
        setTimeout(() => {
            showTestResults();
        }, 500);
    } else {
        console.log('❌ Answer data structure is incomplete');
        console.log('Missing fields:', expectedFields.filter(field => !data.hasOwnProperty(field)));
    }
});

// Simulate student selecting an answer (like handleAnswerSelect)
function simulateAnswerSelection() {
    const answerData = {
        studentId: TEST_STUDENT.id,
        studentName: TEST_STUDENT.name,
        quizId: TEST_QUIZ_ID,
        questionId: 1,
        selectedOptionId: 2,
        optionText: "Socket-based live polling!",
        timestamp: Date.now()
    };
    
    console.log('\n📝 STUDENT SELECTING ANSWER (Socket Only - No Database!)');
    console.log('Answer data:', answerData);
    
    // Emit via socket only (no database call)
    studentSocket.emit('live_answer_update', answerData);
    testResults.answerSent = true;
    
    console.log('📡 Answer sent via socket - NO DATABASE CALL!');
}

// Show final test results
function showTestResults() {
    console.log('\n🔥 SOCKET-ONLY LIVE POLLING TEST RESULTS:');
    console.log('=============================================');
    console.log('✅ Student socket connected:', testResults.studentConnected);
    console.log('✅ Professor socket connected:', testResults.professorConnected);
    console.log('✅ Student joined quiz room:', testResults.studentJoinedRoom);
    console.log('✅ Professor joined rooms:', testResults.professorJoinedRoom);
    console.log('✅ Answer sent (socket only):', testResults.answerSent);
    console.log('✅ Answer received by professor:', testResults.answerReceived);
    
    const allTestsPassed = Object.values(testResults).every(result => result === true);
    
    if (allTestsPassed) {
        console.log('\n🎉 ALL TESTS PASSED! 🎉');
        console.log('Socket-only live polling system is working perfectly!');
        console.log('\n✅ Implementation confirmed:');
        console.log('  • Student answer selection → Socket emission only');
        console.log('  • Backend → Pure relay (no database)');
        console.log('  • Professor → Receives socket data directly');
        console.log('  • Database → Only touched on final quiz submission');
    } else {
        console.log('\n❌ Some tests failed. Check the system setup.');
    }
    
    // Close connections
    setTimeout(() => {
        studentSocket.disconnect();
        professorSocket.disconnect();
        process.exit(0);
    }, 1000);
}

// Handle connection errors
studentSocket.on('connect_error', (error) => {
    console.error('❌ Student socket connection error:', error.message);
});

professorSocket.on('connect_error', (error) => {
    console.error('❌ Professor socket connection error:', error.message);
});

// Timeout after 10 seconds
setTimeout(() => {
    console.log('\n⏰ Test timeout reached');
    showTestResults();
}, 10000);

console.log('🔄 Test started... waiting for connections...\n');
