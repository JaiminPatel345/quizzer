# AI-Powered Quiz Application - API Flow Documentation

## Overview
This document details the complete API flows , showing client requests, internal service and communications.

## Architecture
- **Auth Service** (Port 3001): JWT-based authentication
- **Quiz Service** (Port 3002): Quiz management and orchestration
- **AI Service** (Port 3003): AI-powered generation, evaluation, and hints
- **Submission Service** (Port 3004): Quiz submission handling and scoring
- **Analytics Service** (Port 3005): Performance tracking and leaderboards

---

## 1. Authentication Flow

### 1.1 User Login
**Client Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

**Internal Flow:**
- Auth Service validates credentials (mock auth accepts any username/password)
- Generates JWT token

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "username": "testuser",
      "email": "test@example.com"
    },
    "token": "jwt_token"
  }
}
```

### 1.2 Token Validation
**Client Request:**
```http
POST /api/auth/validate
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "user": {
      "_id": "user_id",
      "username": "testuser",
      "email": "test@example.com"
    }
  }
}
```

---

## 2. Quiz Generation Flow

### 2.1 AI-Generated Quiz Creation
**Client Request:**
```http
POST /api/quiz/ai-generate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Math Quiz",
  "description": "Grade 10 Mathematics",
  "generationParams": {
    "grade": 10,
    "subject": "Mathematics",
    "totalQuestions": 5,
    "difficulty": "medium",
    "topics": ["algebra", "geometry"]
  },
  "metadata": {
    "timeLimit": 30,
    "category": "practice"
  },
  "isPublic": false
}
```

**Internal Service Flow:**
1. **Quiz Service → AI Service**
   ```http
   POST /api/ai/generate/questions
   Authorization: Bearer <jwt_token>
   
   {
     "grade": 10,
     "subject": "Mathematics",
     "totalQuestions": 5,
     "difficulty": "medium",
     "topics": ["algebra", "geometry"]
   }
   ```

2. **AI Service Response:**
   ```json
   {
     "success": true,
     "data": {
       "questions": [
         {
           "questionId": "q1",
           "questionText": "Solve for x: 2x + 5 = 13",
           "questionType": "multiple-choice",
           "options": ["x = 4", "x = 6", "x = 8", "x = 9"],
           "correctAnswer": "x = 4",
           "topic": "algebra",
           "difficulty": "medium",
           "points": 2
         }
       ],
       "metadata": {
         "model": "groq",
         "processingTime": 1250,
         "questionsCount": 5
       }
     }
   }
   ```

### 2.2 Adaptive Quiz Generation
**Client Request:**
```http
POST /api/quiz/ai-generate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Adaptive Math Quiz",
  "generationParams": {
    "adaptiveGeneration": true,
    "grade": 10,
    "subject": "Mathematics",
    "totalQuestions": 10,
    "topics": ["algebra"]
  }
}
```

**Internal Service Flow:**
1. **Quiz Service → Analytics Service** (Fetch User Performance)
   ```http
   GET /api/analytics/performance
   Authorization: Bearer <jwt_token>
   ```

2. **Quiz Service → Submission Service** (Get Recent Submissions)
   ```http
   GET /api/submission?limit=20&sortBy=timing.submittedAt&sortOrder=desc
   Authorization: Bearer <jwt_token>
   ```

3. **Quiz Service → AI Service** (Generate Adaptive Quiz)
   ```http
   POST /api/ai/generate/adaptive
   Authorization: Bearer <jwt_token>
   
   {
     "baseParams": {
       "grade": 10,
       "subject": "Mathematics",
       "totalQuestions": 10,
       "topics": ["algebra"]
     },
     "userPerformanceData": {
       "averageScore": 75,
       "totalQuizzes": 5,
       "recentPerformance": [70, 80, 75],
       "subjectPerformance": {
         "mathematics": {
           "averageScore": 75,
           "totalQuizzes": 3
         }
       }
     }
   }
   ```

**🔒 Security Benefits:**
- **Data Integrity**: User performance data is fetched from trusted internal services, not client input
- **No Tampering**: Clients cannot manipulate their performance data to get easier questions
- **Accurate Analytics**: Performance metrics are based on actual submission history from the database
- **Consistent Data**: All performance calculations use the same algorithms across the system

---

## 3. Quiz Submission and Evaluation Flow

### 3.1 Quiz Submission with AI Evaluation
**Client Request:**
```http
POST /api/quiz/quiz_id/submit
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "answers": [
    {
      "questionId": "q1",
      "userAnswer": "x = 4"
    },
    {
      "questionId": "q2",
      "userAnswer": "option_b"
    }
  ],
  "startedAt": "2024-08-24T10:00:00Z",
  "submittedAt": "2024-08-24T10:15:00Z",
  "requestEvaluation": true,
  "sendAnalyticsToEmail": false
}
```

**Internal Service Flow:**

1. **Quiz Service → Submission Service**
   ```http
   POST /api/submission/submit
   Authorization: Bearer <jwt_token>
   
   {
     "quizId": "quiz_id",
     "answers": [...],
     "startedAt": "2024-08-24T10:00:00Z",
     "submittedAt": "2024-08-24T10:15:00Z",
     "requestEvaluation": true
   }
   ```

2. **Submission Service → Quiz Service** (Fetch Quiz Data)
   ```http
   GET /api/quiz/quiz_id?internal=true
   Authorization: Bearer <jwt_token>
   x-internal-service: true
   ```

3. **Submission Service → AI Service** (Request Evaluation)
   ```http
   POST /api/ai/evaluate/submission
   Authorization: Bearer <jwt_token>
   
   {
     "questions": [
       {
         "questionId": "q1",
         "questionText": "Solve for x: 2x + 5 = 13",
         "correctAnswer": "x = 4",
         "options": ["x = 4", "x = 6", "x = 8", "x = 9"]
       }
     ],
     "answers": [
       {
         "questionId": "q1",
         "userAnswer": "x = 4",
         "isCorrect": true,
         "points": 2
       }
     ]
   }
   ```

4. **Submission Service → Analytics Service** (Update Performance)
   ```http
   POST /api/analytics/performance/update
   Authorization: Bearer <jwt_token>
   
   {
     "subject": "Mathematics",
     "grade": 10,
     "submissionData": {
       "quizId": "quiz_id",
       "scoring": {
         "scorePercentage": 85,
         "correctAnswers": 4,
         "totalQuestions": 5
       },
       "timing": {
         "totalTimeSpent": 900
       },
       "answers": [...],
       "difficulty": "medium"
     }
   }
   ```

**Final Response:**
```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "data": {
    "submission": {
      "_id": "68ab43acda408c09d540b013",
      "quizId": "68ab31f903efba749124a795",
      "attemptNumber": 4,
      "isCompleted": true,
      "createdAt": "2025-08-24T16:54:05.157Z"
    },
    "quiz": {
      "_id": "68ab31f903efba749124a795",
      "title": "Java Programming Quiz",
      "metadata": {
        "grade": 8,
        "subject": "Java",
        "totalQuestions": 10,
        "timeLimit": 20,
        "difficulty": "mixed"
      }
    },
    "performance": {
      "score": {
        "percentage": 80,
        "grade": "B",
        "correctAnswers": 8,
        "totalQuestions": 10,
        "totalPoints": 10
      },
      "timing": {
        "totalTimeSpent": 390,
        "startedAt": "2025-08-24T15:40:00.000Z",
        "submittedAt": "2025-08-24T15:46:30.000Z"
      }
    },
    "aiAnalysis": {
      "model": "groq",
      "evaluatedAt": "2025-08-24T16:54:05.111Z",
      "feedback": {
        "suggestions": [
          "Review and practice declaring valid variable names in Java",
          "Focus on understanding the 'this' keyword in Java"
        ],
        "strengths": [
          "Mastery of easy-level Java Basics concepts",
          "Strong understanding of medium-level OOP concepts"
        ],
        "weaknesses": [
          "Understanding of Java syntax and basics",
          "Clarification needed on the 'this' keyword usage"
        ]
      }
    },
    "metadata": {
      "analytics": {
        "updated": true,
        "message": "Performance data updated automatically"
      },
      "emailSent": false,
      "deviceInfo": {
        "type": "desktop",
        "userAgent": "axios/1.11.0"
      }
    }
  }
}
```

---

## 4. Hint Generation Flow

### 4.1 Generate Hint for Question
**Client Request:**
```http
POST /api/quiz/quiz_id/question/q1/hint
Authorization: Bearer <jwt_token>
```

**Internal Service Flow:**

1. **Quiz Service → AI Service**
   ```http
   POST /api/ai/generate/hint
   Authorization: Bearer <jwt_token>
   
   {
     "question": {
       "questionId": "q1",
       "questionText": "Solve for x: 2x + 5 = 13",
       "questionType": "multiple-choice",
       "options": ["x = 4", "x = 6", "x = 8", "x = 9"],
       "correctAnswer": "x = 4",
       "topic": "algebra",
       "difficulty": "medium"
     }
   }
   ```

2. **AI Service Response:**
   ```json
   {
     "success": true,
     "data": {
       "hints": [
         "Start by isolating the variable x",
         "Subtract 5 from both sides of the equation"
       ]
     }
   }
   ```

**✅ Verification Status:** COMPATIBLE - Hint generation payload matches AI Service expectations

---

## 5. Quiz Retrieval Flow

### 5.1 Get User's Quizzes (Filtered by Creator)
**Client Request:**
```http
GET /api/quiz?grade=10&subject=Mathematics&page=1&limit=10
Authorization: Bearer <jwt_token>
```

**Internal Logic:**
- If authenticated: Returns only quizzes created by the logged-in user
- If no filters provided: Returns all quizzes by that user
- Applies additional filters (grade, subject, etc.) to user's quizzes

**Response:**
```json
{
  "success": true,
  "data": {
    "quizzes": [
      {
        "_id": "quiz_id",
        "title": "Math Quiz",
        "metadata": {
          "grade": 10,
          "subject": "Mathematics",
          "totalQuestions": 5
        },
        "isPublic": false,
        "createdBy": "user_id",
        "questionsCount": 5
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1
    }
  }
}
```

**✅ Verification Status:** CORRECT - Quiz filtering properly implemented to show user's own quizzes

---

## 6. Quiz History and Analytics Flow

### 6.1 Get Quiz History
**Client Request:**
```http
GET /api/quiz/history?grade=10&minScore=70&page=1&limit=10
Authorization: Bearer <jwt_token>
```

**Internal Service Flow:**

1. **Quiz Service → Submission Service**
   ```http
   GET /api/submission?grade=10&minScore=70&page=1&limit=10
   Authorization: Bearer <jwt_token>
   ```

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "submissionId": "submission_id",
        "quizId": "quiz_id",
        "score": 85,
        "grade": "B",
        "completedDate": "2024-08-24T10:15:00Z",
        "hasAIEvaluation": true
      }
    ],
    "pagination": {
      
    }
  }
}
```

**✅ Verification Status:** COMPATIBLE - History retrieval properly delegates to Submission Service

### 6.2 Get Personalized Improvement Suggestions
**Client Request:**
```http
GET /api/quiz/suggestions/personalized
Authorization: Bearer <jwt_token>
```

**Internal Service Flow:**

1. **Quiz Service → Submission Service** (Get Recent Submissions)
   ```http
   GET /api/submission?limit=10&sortBy=timing.submittedAt&sortOrder=desc
   Authorization: Bearer <jwt_token>
   ```

**Response:**
```json
{
  "success": true,
  "data": {
    "improvementTips": {
      "count": 3,
      "tips": [
        "Focus on reviewing basic algebraic manipulation",
        "Practice more geometry problems with visual aids",
        "Work on time management during quizzes"
      ],
      "message": "Based on your recent quiz performance, here are the most important areas to focus on:"
    },
    "analysis": {
      "averageScore": 78.5,
      "performanceLevel": "Good"
    }
  }
}
```

**✅ Verification Status:** COMPATIBLE - Properly aggregates AI evaluation data from submissions

---

## 7. Leaderboard Flow

### 7.1 Get Leaderboard
**Client Request:**
```http
GET /api/analytics/leaderboard?grade=10&subject=Mathematics&timeframe=week
Authorization: Bearer <jwt_token>
```

**Internal Service Flow:**
- Analytics Service processes leaderboard request using aggregated submission data

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "username": "student1",
        "averageScore": 92.5,
        "totalQuizzes": 15
      }
    ],
    "userPosition": {
      "rank": 5,
      "score": 85.2
    }
  }
}
```

**✅ Verification Status:** COMPATIBLE - Leaderboard properly implemented in Analytics Service

---

## 8. Real-time Adaptive Difficulty Adjustment

### 8.1 Adjust Quiz Difficulty During Session
**Client Request:**
```http
POST /api/quiz/quiz_id/adjust-difficulty
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "currentAnswers": [
    {"questionId": "q1", "isCorrect": true},
    {"questionId": "q2", "isCorrect": false}
  ],
  "remainingQuestions": 3,
  "currentDifficulty": "medium",
  "subject": "Mathematics",
  "timeRemaining": 600
}
```

**Internal Service Flow:**

1. **Quiz Service → AI Service**
   ```http
   POST /api/ai/generate/adjust-difficulty
   Authorization: Bearer <jwt_token>
   
   {
     "currentAnswers": [...],
     "remainingQuestions": 3,
     "currentDifficulty": "medium",
     "subject": "Mathematics",
     "timeRemaining": 600
   }
   ```

**✅ Verification Status:** COMPATIBLE - Real-time adjustment payload matches AI Service endpoint

---

## Service Compatibility Summary

| Flow | Service Communication | Status | Notes |
|------|----------------------|--------|--------|
| Quiz Generation | Quiz Service → AI Service | ✅ COMPATIBLE | Payload structures match |
| Adaptive Generation | Quiz Service → AI Service | ✅ COMPATIBLE | Adaptive params correctly structured |
| Quiz Submission | Quiz Service → Submission Service | ✅ COMPATIBLE | Submission flow properly orchestrated |
| AI Evaluation | Submission Service → AI Service | ✅ COMPATIBLE | Evaluation payload matches expectations |
| Analytics Update | Submission Service → Analytics Service | ✅ COMPATIBLE | Performance data properly structured |
| Hint Generation | Quiz Service → AI Service | ✅ COMPATIBLE | Hint request format correct |
| Quiz Retrieval | Client → Quiz Service | ✅ CORRECT | User filtering properly implemented |
| History Retrieval | Quiz Service → Submission Service | ✅ COMPATIBLE | History delegation works correctly |
| Leaderboard | Client → Analytics Service | ✅ COMPATIBLE | Leaderboard endpoints implemented |

## Known Issues and Fixes Applied

1. **User Model Dependency**: ✅ FIXED - Removed `.populate('createdBy')` calls from Quiz Service
2. **Quiz Filtering**: ✅ FIXED - Updated to return only user's own quizzes when authenticated
3. **Service Communication**: ✅ VERIFIED - All internal API calls use correct payload structures
4. **Error Handling**: ✅ IMPLEMENTED - Proper error handling for service failures with fallbacks

## Key Features Verified

- ✅ Mock authentication accepting any username/password
- ✅ JWT token generation and validation
- ✅ AI-powered quiz generation with multiple difficulty levels
- ✅ Adaptive difficulty based on user performance
- ✅ Real-time difficulty adjustment during quiz sessions
- ✅ AI-powered hint generation for questions
- ✅ Comprehensive quiz submission with AI evaluation
- ✅ Improvement suggestions based on AI analysis
- ✅ Quiz history with advanced filtering
- ✅ Personalized analytics and recommendations
- ✅ Leaderboard functionality
- ✅ Email notifications for quiz results (bonus feature)
- ✅ Proper error handling and service resilience

All API flows have been verified for correct service-to-service communication and payload compatibility.
