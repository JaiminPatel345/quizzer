# AI Service API Documentation

**Base URL**: `http://localhost:3003`  
**Port**: 3003  
**Authentication**: Bearer token required for all endpoints  
**Dependencies**: Auth Service for authentication, Groq API, Gemini API

## Health & Info Endpoints

### Service Info
**GET** `/`  
**Authentication**: None  
**Response**:
```json
{
    "success": true,
    "message": "AI Service API",
    "version": "1.0.0",
    "endpoints": {
        "health": "/health",
        "generation": "/api/ai/generate",
        "evaluation": "/api/ai/evaluate"
    }
}
```


### Health Check
**GET** `/health`  
**Authentication**: None  
**Response**:
```json
{
    "success": true,
    "service": "ai-service",
    "status": "healthy",
    "timestamp": "2025-08-23T19:01:04.365Z"
}
```
---

## AI Generation Endpoints

### Generate Quiz Questions
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
