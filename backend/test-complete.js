const axios = require('axios');

async function testCompleteQuiz() {
    try {
        // First, let's test the health endpoint
        const healthResponse = await axios.get('http://localhost:5000/health');
        console.log('✅ Health check:', healthResponse.data);

        // Now let's test the complete quiz endpoint with a test payload
        const response = await axios.post('http://localhost:5000/api/submissions/complete', {
            submissionId: 1
        }, {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MjE4ODEwNywiZXhwIjoxNzUyMjc0NTA3fQ.tgEvMUUE9JKwZW5FvXMNoAoJwyL-SZLNwz5MFQm_TNc',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Complete quiz response:', response.data);
    } catch (error) {
        console.error('❌ Error testing complete quiz:', error.response?.data || error.message);
        console.error('❌ Status:', error.response?.status);
    }
}

testCompleteQuiz();
