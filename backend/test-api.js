const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testAPI() {
    try {
        console.log('🧪 Testing Quiz Management System API...\n');

        // Test 1: Health Check
        console.log('1. Testing Health Check...');
        try {
            const healthResponse = await axios.get('http://localhost:5000/health');
            console.log('✅ Health Check:', healthResponse.data.status);
        } catch (error) {
            console.log('❌ Health Check failed:', error.message);
            return;
        }

        // Test 2: User Registration
        console.log('\n2. Testing User Registration...');
        const testUser = {
            username: 'testuser' + Date.now(),
            email: `test${Date.now()}@example.com`,
            password: 'TestPass123!',
            firstName: 'Test',
            lastName: 'User'
        };

        try {
            const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUser);
            console.log('✅ Registration successful');
            console.log('   User ID:', registerResponse.data.user.id);
            console.log('   Role:', registerResponse.data.user.role);
            
            const token = registerResponse.data.token;

            // Test 3: User Login
            console.log('\n3. Testing User Login...');
            try {
                const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
                    username: testUser.username,
                    password: testUser.password
                });
                console.log('✅ Login successful');
                console.log('   Token received');
            } catch (error) {
                console.log('❌ Login failed:', error.response?.data?.message || error.message);
            }

            // Test 4: Protected Route (Profile)
            console.log('\n4. Testing Protected Route...');
            try {
                const profileResponse = await axios.get(`${API_BASE_URL}/auth/verify`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('✅ Protected route accessible');
                console.log('   User:', profileResponse.data.user.username);
            } catch (error) {
                console.log('❌ Protected route failed:', error.response?.data?.message || error.message);
            }

            // Test 5: Classes Endpoint
            console.log('\n5. Testing Classes Endpoint...');
            try {
                const classesResponse = await axios.get(`${API_BASE_URL}/classes`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('✅ Classes endpoint accessible');
                console.log('   Classes count:', classesResponse.data.length || 0);
            } catch (error) {
                console.log('❌ Classes endpoint failed:', error.response?.data?.message || error.message);
            }

            // Test 6: Quizzes Endpoint
            console.log('\n6. Testing Quizzes Endpoint...');
            try {
                const quizzesResponse = await axios.get(`${API_BASE_URL}/quizzes`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('✅ Quizzes endpoint accessible');
                console.log('   Quizzes count:', quizzesResponse.data.length || 0);
            } catch (error) {
                console.log('❌ Quizzes endpoint failed:', error.response?.data?.message || error.message);
            }

        } catch (error) {
            console.log('❌ Registration failed:', error.response?.data?.message || error.message);
            if (error.response?.data?.details) {
                console.log('   Details:', error.response.data.details);
            }
        }

        console.log('\n🎉 API Testing Complete!\n');
        console.log('💡 Tips:');
        console.log('   - Make sure your database is running');
        console.log('   - Check that all tables are created');
        console.log('   - Verify your .env file configuration');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run test if file is executed directly
if (require.main === module) {
    testAPI();
}

module.exports = testAPI; 