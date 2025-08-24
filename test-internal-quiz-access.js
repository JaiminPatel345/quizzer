// Test script to verify internal quiz access
const axios = require('axios');

const QUIZ_SERVICE_URL = 'http://localhost:3002';
const AUTH_TOKEN = 'Bearer test-token'; // You'll need to replace with actual token

async function testInternalQuizAccess() {
  try {
    console.log('Testing internal quiz access...');
    
    // Test normal access (should not include answers)
    console.log('\n1. Testing normal user access (should not include answers):');
    try {
      const normalResponse = await axios.get(`${QUIZ_SERVICE_URL}/api/quiz/68ab31f903efba749124a795`, {
        headers: { Authorization: AUTH_TOKEN }
      });
      console.log('Questions include correct answers:', 
        normalResponse.data.data.quiz.questions.some(q => q.correctAnswer !== undefined));
    } catch (error) {
      console.error('Normal access error:', error.response?.status, error.response?.data);
    }
    
    // Test internal access (should include answers)
    console.log('\n2. Testing internal service access (should include answers):');
    try {
      const internalResponse = await axios.get(`${QUIZ_SERVICE_URL}/api/quiz/68ab31f903efba749124a795?internal=true`, {
        headers: { 
          Authorization: AUTH_TOKEN,
          'x-internal-service': 'true'
        }
      });
      console.log('Questions include correct answers:', 
        internalResponse.data.data.quiz.questions.some(q => q.correctAnswer !== undefined));
      console.log('First question correct answer:', 
        internalResponse.data.data.quiz.questions[0]?.correctAnswer);
    } catch (error) {
      console.error('Internal access error:', error.response?.status, error.response?.data);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testInternalQuizAccess();
