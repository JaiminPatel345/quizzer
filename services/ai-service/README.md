# AI Service API Documentation - Live on Azure! 🚀

## 🌐 Live Service URL
**Base URL**: http://quizzer-ai-1756068070.southindia.azurecontainer.io:3003
**Health Check**: http://quizzer-ai-1756068070.southindia.azurecontainer.io:3003/health

**Port**: 3003  
**Authentication**: Bearer token required for all endpoints  
**Dependencies**: Auth Service for authentication, Groq API, Gemini API

## 🧪 Quick Test
```bash
# Test the live service
curl http://quizzer-ai-1756068070.southindia.azurecontainer.io:3003/health
```

---

## Table of Contents
1. [Health & Info Endpoints](#health--info-endpoints)
2. [AI Question Generation Endpoints](#ai-question-generation-endpoints)
3. [AI Evaluation Endpoints](#ai-evaluation-endpoints)
4. [Adaptive Learning Endpoints](#adaptive-learning-endpoints)
5. [API Testing Flows](#api-testing-flows)

---

## Health & Info Endpoints

### Service Info
**GET** `/`  
**Authentication**: None  
**Response**:
```json

```

### Health Check
**GET** `/health`  
**Authentication**: None  
**Response**:
```json

```

---

## AI Question Generation Endpoints

### Generate Standard Questions
**POST** `/api/ai/generate/questions`  
**Authentication**: Required  
**Rate Limit**: 10 requests per 5 minutes  
**Request Body**:
```json
{
  "grade": "number (required, 1-12)",
  "subject": "string (required, 2-100 chars)",
  "difficulty": "string (required, easy|medium|hard|mixed)",
  "totalQuestions": "number (required, 1-50)",
  "topics": ["string array (optional, each max 100 chars)"],
  "adaptiveParams": {
    "userPastPerformance": {
      "averageScore": "number (required, 0-100)",
      "totalQuizzes": "number (required, 0+)",
      "strongSubjects": ["string array (optional, each max 100 chars)"],
      "weakSubjects": ["string array (optional, each max 100 chars)"],
      "recentPerformance": [
        {
          "score": "number (optional, 0-100)",
          "date": "string (optional, ISO date)",
          "subject": "string (optional, max 100 chars)"
        }
      ]
    },
    "targetDifficulty": "string (optional, easy|medium|hard)",
    "focusAreas": ["string array (optional, each max 100 chars)"],
    "adaptationStrategy": "string (optional, performance_based|weakness_focus|balanced)"
  }
}
```

**Response**:
```json

```

### Generate Adaptive Questions
**POST** `/api/ai/generate/adaptive`  
**Authentication**: Required  
**Rate Limit**: 10 requests per 5 minutes  
**Request Body**:
```json
{
  "grade": "number (required, 1-12)",
  "subject": "string (required, 2-100 chars)",
  "difficulty": "string (required, easy|medium|hard|mixed)",
  "totalQuestions": "number (required, 1-50)",
  "topics": ["string array (optional, each max 100 chars)"],
  "userPerformanceProfile": {
    "averageScore": "number (required, 0-100)",
    "strongAreas": ["string array (optional, each max 100 chars)"],
    "weakAreas": ["string array (optional, each max 100 chars)"],
    "learningStyle": "string (optional, visual|auditory|kinesthetic|reading)",
    "difficultyPreference": "string (optional, gradual|challenge|mixed)"
  },
  "adaptationLevel": "string (optional, basic|intermediate|advanced)"
}
```

**Response**:
```json

```

### Real-time Difficulty Adjustment
**POST** `/api/ai/generate/adjust-difficulty`  
**Authentication**: Required  
**Rate Limit**: 20 requests per 5 minutes  
**Request Body**:
```json
{
  "quizSessionId": "string (required)",
  "currentProgress": {
    "questionsAnswered": "number (required, 0+)",
    "correctAnswers": "number (required, 0+)",
    "avgTimePerQuestion": "number (required, 0+)",
    "hintsUsed": "number (required, 0+)"
  },
  "adjustmentType": "string (required, increase|decrease|maintain)",
  "nextQuestionCount": "number (optional, 1-10, default: 1)"
}
```

**Response**:
```json

```

### Generate Hint for Question
**POST** `/api/ai/generate/hint`  
**Authentication**: Required  
**Rate Limit**: 30 requests per 5 minutes  
**Request Body**:
```json
{
  "questionText": "string (required, 10-1000 chars)",
  "questionType": "string (required, mcq|true_false|short_answer)",
  "correctAnswer": "string (required)",
  "userAnswer": "string (optional)",
  "hintLevel": "number (optional, 1-3, default: 1)",
  "subject": "string (required, 2-100 chars)",
  "grade": "number (required, 1-12)"
}
```

**Response**:
```json

```

---

## AI Evaluation Endpoints

### Evaluate Quiz Submission
**POST** `/api/ai/evaluate/submission`  
**Authentication**: Required  
**Rate Limit**: 20 requests per 5 minutes  
**Request Body**:
```json
{
  "quizId": "string (required, MongoDB ObjectId)",
  "submissionId": "string (required, MongoDB ObjectId)",
  "answers": [
    {
      "questionId": "string (required)",
      "questionText": "string (required)",
      "questionType": "string (required, mcq|true_false|short_answer)",
      "userAnswer": "string (required)",
      "correctAnswer": "string (required)",
      "isCorrect": "boolean (required)",
      "timeSpent": "number (optional, 0+)",
      "hintsUsed": "number (optional, 0+)"
    }
  ],
  "overallScore": "number (required, 0-100)",
  "grade": "number (required, 1-12)",
  "subject": "string (required, 2-100 chars)"
}
```

**Response**:
```json

```

### Get Improvement Suggestions
**POST** `/api/ai/evaluate/suggestions`  
**Authentication**: Required  
**Rate Limit**: 15 requests per 5 minutes  
**Request Body**:
```json
{
  "userId": "string (required, MongoDB ObjectId)",
  "grade": "number (required, 1-12)",
  "subject": "string (required, 2-100 chars)",
  "recentPerformance": [
    {
      "quizId": "string (required)",
      "score": "number (required, 0-100)",
      "completedAt": "string (required, ISO date)",
      "weakTopics": ["string array (optional)"],
      "timeSpent": "number (optional, 0+)"
    }
  ],
  "targetScore": "number (optional, 0-100, default: current average + 10)",
  "suggestionType": "string (optional, study_plan|resource_recommendation|practice_areas|all)"
}
```

**Response**:
```json

```

---

## API Testing Flows

### Flow 1: AI Question Generation
1. **Authentication**: Login via Auth Service to get Bearer token
2. **Generate Questions**: `POST /api/ai/generate/questions` with topic requirements
3. **Use Generated Questions**: Send to Quiz Service for quiz creation

### Flow 2: Adaptive Learning Experience
1. **Authentication**: Login via Auth Service to get Bearer token
2. **Get User Performance**: Retrieve from Analytics Service
3. **Generate Adaptive Questions**: `POST /api/ai/generate/adaptive` with performance data
4. **Real-time Adjustment**: `POST /api/ai/generate/adjust-difficulty` during quiz

### Flow 3: Hint Generation During Quiz
1. **Authentication**: Login via Auth Service to get Bearer token
2. **Request Hint**: `POST /api/ai/generate/hint` for specific question
3. **Progressive Hints**: Call with increasing hint levels (1, 2, 3)

### Flow 4: AI-Powered Evaluation & Suggestions
1. **Authentication**: Login via Auth Service to get Bearer token
2. **Submit for Evaluation**: `POST /api/ai/evaluate/submission` after quiz completion
3. **Get Suggestions**: `POST /api/ai/evaluate/suggestions` for improvement areas

**Example Postman Testing**:
- **Base URL**: `http://localhost:3003`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Rate Limits**: Strict AI limits (10-30 requests per 5 minutes)
- **Flow**: Auth → Generate Questions → Create Quiz → Evaluate Results

---

## Error Responses

All endpoints return consistent error format:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "functionName": "methodName", 
    "timestamp": "ISO timestamp",
    "details": "Additional error details (when applicable)"
  }
}
```

**Common HTTP Status Codes**:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden (API quota exceeded)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable (AI provider issues)

**Rate Limit Headers**:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets
  "grade": "number (required, 1-12)",
  "subject": "string (required, 2-100 chars)",
  "difficulty": "string (required, easy|medium|hard|mixed)",
  "totalQuestions": "number (required, 1-50)",
  "topics": ["string array (optional, each max 100 chars)"],
  "adaptiveParams": {
    "userPastPerformance": {
      "averageScore": "number (optional, 0-100)",
      "totalQuizzes": "number (optional, min 0)"
    },
    "difficultyDistribution": {
      "easy": "number (optional, percentage)",
      "medium": "number (optional, percentage)",
      "hard": "number (optional, percentage)"
    }
  }
}
```
**Response**:
```json
{
    "success": true,
    "message": "Questions generated successfully",
    "data": {
        "questions": [
            {
                "questionId": "q1",
                "questionText": "What is the main purpose of JavaScript?",
                "questionType": "mcq",
                "options": [
                    "Server-side scripting",
                    "Client-side scripting",
                    "Database management",
                    "All of the above"
                ],
                "correctAnswer": "Client-side scripting",
                "explanation": "JavaScript is primarily used for client-side scripting in web browsers.",
                "difficulty": "easy",
                "points": 1,
                "hints": [
                    "Think about where JavaScript code is executed",
                    "Consider the role of JavaScript in web development"
                ],
                "topic": "JavaScript Basics"
            },
            {
                "questionId": "q2",
                "questionText": "Is Java an object-oriented programming language?",
                "questionType": "true/false",
                "correctAnswer": "true",
                "explanation": "Java is indeed an object-oriented programming language.",
                "difficulty": "easy",
                "points": 1,
                "hints": [
                    "Recall the basic characteristics of Java",
                    "Consider the principles of object-oriented programming"
                ],
                "topic": "Java Fundamentals"
            },
            {
                "questionId": "q3",
                "questionText": "What is the difference between Java and JavaScript?",
                "questionType": "short answer",
                "correctAnswer": "Java is an object-oriented programming language used for Android apps, web, and enterprise development, while JavaScript is a scripting language used for client-side web development.",
                "explanation": "Java and JavaScript are distinct languages with different origins, syntax, and use cases.",
                "difficulty": "medium",
                "points": 2,
                "hints": [
                    "Think about the origins and syntax of both languages",
                    "Consider their typical use cases and platforms"
                ],
                "topic": "Programming Languages"
            },
            {
                "questionId": "q4",
                "questionText": "What is a variable in JavaScript?",
                "questionType": "short answer",
                "correctAnswer": "A variable in JavaScript is a name given to a value.",
                "explanation": "Variables in JavaScript are used to store and manipulate values.",
                "difficulty": "easy",
                "points": 1,
                "hints": [
                    "Recall the basic concept of variables in programming",
                    "Think about how variables are used in JavaScript"
                ],
                "topic": "JavaScript Basics"
            },
            {
                "questionId": "q5",
                "questionText": "What is Java commonly used for?",
                "questionType": "mcq",
                "options": [
                    "Web development",
                    "Mobile app development",
                    "Enterprise software development",
                    "All of the above"
                ],
                "correctAnswer": "All of the above",
                "explanation": "Java is a versatile language used for a wide range of applications, including web, mobile, and enterprise development.",
                "difficulty": "medium",
                "points": 2,
                "hints": [
                    "Think about Java's platform independence",
                    "Consider the types of applications built with Java"
                ],
                "topic": "Java Applications"
            }
        ],
        "metadata": {
            "model": "groq",
            "processingTime": 1839,
            "questionsCount": 5
        }
    }
}
```

### Generate Adaptive Questions
**POST** `/api/ai/generate/adaptive`  
**Authentication**: Required  
**Rate Limit**: 10 requests per 5 minutes  
**Request Body**:
```json
{
  "baseParams": {
    "grade": "number (required, 1-12)",
    "subject": "string (required, 2-100 chars)",
    "totalQuestions": "number (required, 1-50)",
    "topics": ["string array (optional)"]
  },
  "userPerformanceData": {
    "averageScore": "number (required, 0-100)",
    "totalQuizzes": "number (required, min 0)",
    "strongSubjects": ["string array (optional)"],
    "weakSubjects": ["string array (optional)"],
    "recentPerformance": ["array (optional)"]
  }
}
```
**Response**:
```json

```

### Generate Hint
**POST** `/api/ai/generate/hint`  
**Authentication**: Required  
**Rate Limit**: 10 requests per 5 minutes  
**Request Body**:
```json
{
  "question": {
    "questionId": "string (required)",
    "questionText": "string (required, 10-1000 chars)",
    "questionType": "string (required, mcq|true_false|short_answer)",
    "difficulty": "string (required, easy|medium|hard)",
    "topic": "string (required, 2-100 chars)",
    "options": ["string array (optional for mcq)"],
    "correctAnswer": "string (optional)"
  }
}
```
**Response**:
```json

```

## AI Evaluation Endpoints

### Evaluate Quiz Submission
**POST** `/api/ai/evaluate/submission`  
**Authentication**: Required  
**Rate Limit**: 10 requests per 5 minutes  
**Request Body**:
```json
{
  "questions": [
    {
      "questionId": "string (required)",
      "questionText": "string (required)",
      "questionType": "string (required, mcq|true_false|short_answer)",
      "difficulty": "string (required, easy|medium|hard)",
      "topic": "string (required)",
      "correctAnswer": "string (required)",
      "options": ["string array (optional)"]
    }
  ],
  "answers": [
    {
      "questionId": "string (required)",
      "userAnswer": "string (required)",
      "isCorrect": "boolean (required)",
      "pointsEarned": "number (required, min 0)",
      "timeSpent": "number (required, min 0)",
      "hintsUsed": "number (required, integer, min 0)"
    }
  ]
}
```
**Response**:
```json

```

### Get Performance Suggestions
**POST** `/api/ai/evaluate/suggestions`  
**Authentication**: Required  
**Rate Limit**: 10 requests per 5 minutes  
**Request Body**:
```json
{
  "performanceData": {
    "averageScore": "number (required, 0-100)",
    "totalQuizzes": "number (required, integer, min 0)",
    "strongSubjects": ["string array (optional)"],
    "weakSubjects": ["string array (optional)"],
    "recentPerformance": ["array (optional)"]
  },
  "subject": "string (optional, max 100 chars)",
  "grade": "number (optional, 1-12)"
}
```
**Response**:
```json

```

## AI Models & Strategy

### Supported AI Providers
- **Primary**: Groq API
- **Fallback**: Google Gemini Pro
- **Strategy**: Automatic failover - tries Groq first, falls back to Gemini on error

### Response Metadata
All AI responses include metadata about which model was used:
```json
{
  "data": {
    "metadata": {
      "model": "groq|gemini",
      "processingTime": "number (milliseconds)",
      "questionsCount": "number (for generation endpoints)"
    }
  }
}
```

## Error Responses

All endpoints return consistent error format:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "functionName": "methodName",
    "timestamp": "2025-08-24T00:00:00.000Z",
    "details": "Additional error details (when applicable)"
  }
}
```

**Common HTTP Status Codes**:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (AI service failure)

## Rate Limits

- **AI generation/evaluation endpoints**: 10 requests per 5 minutes per IP (expensive AI operations)
- **General endpoints**: 100 requests per 15 minutes per IP

When rate limit is exceeded:
```json
{
  "success": false,
  "error": {
    "message": "Too many AI requests, please wait 5 minutes before generating more content.",
    "code": "AI_RATE_LIMIT_EXCEEDED",
    "retryAfter": 300
  }
}
```

## Validation Rules

### Question Generation
- **grade**: Must be integer 1-12
- **subject**: 2-100 characters, required
- **totalQuestions**: 1-50 questions maximum
- **difficulty**: Must be easy|medium|hard|mixed
- **topics**: Each topic max 100 characters

### Adaptive Generation
- **userPerformanceData**: Required for adaptive questions
- **averageScore**: Must be 0-100
- **baseParams**: All standard generation rules apply

### Hint Generation
- **question object**: Must contain valid question structure
- **questionText**: 10-1000 characters
- **questionType**: Must be valid enum value

### Evaluation
- **questions array**: Minimum 1 question required
- **answers array**: Must match questions array length
- **isCorrect**: Must be boolean
- **pointsEarned**: Must be non-negative number

## AI Task Logging

All AI operations are automatically logged to database with:
- Task type (generation|evaluation|hint)
- Input/output data summaries
- Processing time and model used
- Success/failure status
- User ID and timestamp

## Environment Requirements

Required environment variables:
- `GROQ_API_KEY`: Groq API authentication key
- `GEMINI_API_KEY`: Google Gemini API key
- `AUTH_SERVICE_URL`: Auth service endpoint for token validation
- `MONGODB_URI`: Database for AI task logging

At least one AI API key must be provided for service to function.
