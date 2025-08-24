// Test script to verify analytics validation fix
const axios = require('axios');

const ANALYTICS_SERVICE_URL = 'http://localhost:3005';
const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGFiMjI1MWU2MjIyYmI0YTFkOThhODUiLCJ1c2VybmFtZSI6ImphaW1pbjEyMyIsImVtYWlsIjoiamFpbWluMTIzQG1vY2suY29tIiwiaWF0IjoxNzU2MDQ1OTA1LCJleHAiOjE3NTY2NTA3MDV9.xk9f80wYYHrwfEN1qv8NNaiTieR1vxq-StoPZgDPCZc';

async function testAnalyticsValidation() {
  try {
    console.log('Testing analytics validation with different difficulty values...');
    
    const testPayloads = [
      { difficulty: 'easy' },
      { difficulty: 'medium' }, 
      { difficulty: 'hard' },
      { difficulty: 'mixed' },
      { difficulty: 'adaptive' }
    ];
    
    for (const testPayload of testPayloads) {
      console.log(`\nTesting difficulty: ${testPayload.difficulty}`);
      
      try {
        const response = await axios.post(`${ANALYTICS_SERVICE_URL}/api/analytics/performance/update`, {
          subject: 'Java',
          grade: 10,
          submissionData: {
            quizId: '68ab31f903efba749124a795',
            scoring: {
              scorePercentage: 85,
              totalQuestions: 10,
              correctAnswers: 8,
              totalPoints: 85,
              grade: 'B'
            },
            timing: {
              totalTimeSpent: 300,
              startedAt: new Date(),
              submittedAt: new Date()
            },
            answers: [],
            difficulty: testPayload.difficulty
          }
        }, {
          headers: { Authorization: AUTH_TOKEN }
        });
        
        console.log(`  ✅ ${testPayload.difficulty}: SUCCESS`);
      } catch (error) {
        console.log(`  ❌ ${testPayload.difficulty}: FAILED - ${error.response?.data?.message || error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testAnalyticsValidation();
