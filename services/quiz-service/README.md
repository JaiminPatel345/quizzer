# Quiz Service API Documentation - Live on Azure! 🚀

## 🌐 Live Service URL
**Base URL**: http://quizzer-quiz-1756068070.southindia.azurecontainer.io:3002
**Health Check**: http://quizzer-quiz-1756068070.southindia.azurecontainer.io:3002/health

**Port**: 3002  
**Authentication**: Bearer token required for protected endpoints  
**Dependencies**: Auth Service for authentication

## 🧪 Quick Test
```bash
# Test the live service
curl http://quizzer-quiz-1756068070.southindia.azurecontainer.io:3002/health
```

---

## Table of Contents
1. [Health & Info Endpoints](#health--info-endpoints)
2. [Quiz Management Endpoints](#quiz-management-endpoints)
3. [AI-Generated Quiz Endpoints](#ai-generated-quiz-endpoints)
4. [Quiz Interaction Endpoints](#quiz-interaction-endpoints)
5. [History & Analytics Endpoints](#history--analytics-endpoints)
6. [Adaptive Learning Endpoints](#adaptive-learning-endpoints)
7. [API Testing Flows](#api-testing-flows)

---

## Health & Info Endpoints

### Service Info
**GET** `/`  
**Authentication**: None  
**Response**: 
```json
{
    "success": true,
    "message": "Quiz Service API",
    "version": "1.0.0",
    "endpoints": {
        "health": "/health",
        "quiz": "/api/quiz"
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
    "service": "quiz-service",
    "status": "healthy",
    "timestamp": "2025-08-24T15:12:46.814Z"
}
```

---

## Quiz Management Endpoints

### Get Quiz List
**GET** `/api/quiz`  
**Authentication**: Optional (affects public/private visibility)  
**Rate Limit**: 50 requests per 15 minutes  
**Query Parameters**:
- `grade`: number (1-12, optional)
- `subject`: string (optional) 
- `difficulty`: string (easy|medium|hard|mixed, optional)
- `category`: string (optional)
- `tags`: string (comma-separated, optional)
- `isPublic`: boolean (optional)
- `page`: number (default: 1)
- `limit`: number (default: 10, max: 100)
- `sortBy`: string (createdAt|title|metadata.grade|metadata.subject, default: createdAt)
- `sortOrder`: string (asc|desc, default: desc)

**Response**:
```json

```

### Get Quiz by ID
**GET** `/api/quiz/:quizId`  
**Authentication**: Optional (required for private quizzes)  
**Parameters**:
- `quizId`: string (MongoDB ObjectId, required)

**Response**:
```json

```

### Create Quiz ( not for client but for internal service )
**POST** `/api/quiz`  
**Authentication**: Required  
**Rate Limit**: 50 requests per 15 minutes  
**Request Body**:
```json
{
  "title": "string (required, 3-200 chars)",
  "description": "string (optional, max 1000 chars)",
  "metadata": {
    "grade": "number (required, 1-12)",
    "subject": "string (required, 2-100 chars)",
    "totalQuestions": "number (required, 1-50)",
    "timeLimit": "number (required, 5-180 minutes)",
    "difficulty": "string (required, easy|medium|hard|mixed)",
    "tags": ["string array (optional, each max 50 chars)"],
    "category": "string (optional, max 100 chars)"
  },
  "questions": [
    {
      "questionId": "string (required)",
      "questionText": "string (required, 10-1000 chars)",
      "questionType": "string (required, mcq|true_false|short_answer)",
      "options": ["string array (required for mcq, 2-6 options, each max 200 chars)"],
      "correctAnswer": "string (required)",
      "explanation": "string (optional, max 500 chars)",
      "difficulty": "string (required, easy|medium|hard)",
      "points": "number (optional, 1-10, default: 1)",
      "hints": ["string array (optional, each max 200 chars)"],
      "topic": "string (required, 2-100 chars)"
    }
  ],
  "template": "string (optional, max 100 chars)",
  "isPublic": "boolean (optional, default: false)"
}
```

### Update Quiz
**PUT** `/api/quiz/:quizId`  
**Authentication**: Required (must be quiz creator)  
**Rate Limit**: 50 requests per 15 minutes  
**Parameters**:
- `quizId`: string (MongoDB ObjectId, required)

**Request Body**:
```json
{
  "title": "string (optional, 3-200 chars)",
  "description": "string (optional, max 1000 chars)",
  "isActive": "boolean (optional)",
  "isPublic": "boolean (optional)"
}
```

**Response**:
```json

```

### Delete Quiz
**DELETE** `/api/quiz/:quizId`  
**Authentication**: Required (must be quiz creator)  
**Rate Limit**: 50 requests per 15 minutes  
**Parameters**:
- `quizId`: string (MongoDB ObjectId, required)

**Response**:
```json

```

### Duplicate Quiz
**POST** `/api/quiz/:quizId/duplicate`  
**Authentication**: Required  
**Rate Limit**: 50 requests per 15 minutes  
**Parameters**:
- `quizId`: string (MongoDB ObjectId, required)

**Request Body**:
```json
{
  "title": "string (optional, 3-200 chars, defaults to 'Original Title (Copy)')"
}
```


---

## AI-Generated Quiz Endpoints

### Generate AI Quiz ( for client )
**POST** `/api/quiz/generate`  
**Authentication**: Required  
**Rate Limit**: 50 requests per 15 minutes  
**Request Body**:
```json
{
  "title": "string (required, 3-200 chars)",
  "description": "string (optional, max 1000 chars)",
  "metadata": {
    "grade": "number (required, 1-12)",
    "subject": "string (required, 2-100 chars)",
    "totalQuestions": "number (required, 1-50)",
    "timeLimit": "number (required, 5-180 minutes)",
    "difficulty": "string (required, easy|medium|hard|mixed)",
    "tags": ["string array (optional, each max 50 chars)"],
    "category": "string (optional, max 100 chars)"
  },
  "template": "string (optional, max 100 chars)",
  "isPublic": "boolean (optional, default: false)",
  "questionTypes": ["string array (optional, mcq|true_false|short_answer)"],
  "topics": ["string array (optional, each max 100 chars)"]
}
```

---

## Quiz Interaction Endpoints

### Submit Quiz
**POST** `/api/quiz/:quizId/submit`  
**Authentication**: Required  
**Rate Limit**: 50 requests per 15 minutes  
**Parameters**:
- `quizId`: string (MongoDB ObjectId, required)

**Request Body**:
```json
{
  "answers": [
    {
      "questionId": "string (required)",
      "userAnswer": "string (required)",
      "timeSpent": "number (optional, 0-7200 seconds, default: 0)",
      "hintsUsed": "number (optional, 0-10, default: 0)"
    }
  ],
  "startedAt": "string (required, ISO date)",
  "submittedAt": "string (optional, ISO date, default: current time)",
  "requestEvaluation": "boolean (optional, default: false)"
}
```
---
### Generate Hint for Question
**POST** `/api/quiz/:quizId/question/:questionId/hint`  
**Authentication**: Required  
**Rate Limit**: 50 requests per 15 minutes  
**Parameters**:
- `quizId`: string (MongoDB ObjectId, required)
- `questionId`: string (required)

**Request Body**:
```json
{
  "hintLevel": "number (optional, 1-3, default: 1)",
  "userAnswer": "string (optional)"
}
```

---

### Update Question Hints
**PUT** `/api/quiz/:quizId/question/:questionId/hints`  
**Authentication**: Required (must be quiz creator)  
**Rate Limit**: 50 requests per 15 minutes  
**Parameters**:
- `quizId`: string (MongoDB ObjectId, required)
- `questionId`: string (required)

**Request Body**:
```json
{
  "hints": ["string array (required, each max 200 chars)"]
}
```

**Response**:
```json

```

---

## History & Analytics Endpoints

### Get Quiz History
**GET** `/api/quiz/history`  
**Authentication**: Required  
**Rate Limit**: 50 requests per 15 minutes  
**Query Parameters**:
- `grade`: number (1-12, optional)
- `subject`: string (optional)
- `difficulty`: string (easy|medium|hard|mixed, optional)
- `page`: number (default: 1)
- `limit`: number (default: 10, max: 100)
- `sortBy`: string (createdAt|score|timeSpent, default: createdAt)
- `sortOrder`: string (asc|desc, default: desc)

**Response**:
```json

```

### Get Submission Suggestions
**GET** `/api/quiz/submission/:submissionId/suggestions`  
**Authentication**: Required  
**Parameters**:
- `submissionId`: string (MongoDB ObjectId, required)

**Response**:
```json

```

### Get Personalized Suggestions
**GET** `/api/quiz/suggestions`  
**Authentication**: Required  

**Response**:
```json

```

---

## Adaptive Learning Endpoints

### Create Adaptive Quiz
**POST** `/api/quiz/adaptive`  
**Authentication**: Required  
**Rate Limit**: 50 requests per 15 minutes  
**Request Body**:
```json
{
  "title": "string (required, 3-200 chars)",
  "description": "string (optional, max 1000 chars)",
  "metadata": {
    "grade": "number (required, 1-12)",
    "subject": "string (required, 2-100 chars)",
    "totalQuestions": "number (required, 1-50)",
    "timeLimit": "number (required, 5-180 minutes)",
    "difficulty": "string (required, easy|medium|hard|mixed)",
    "tags": ["string array (optional, each max 50 chars)"],
    "category": "string (optional, max 100 chars)"
  },
  "template": "string (optional, max 100 chars)",
  "isPublic": "boolean (optional, default: false)",
  "questionTypes": ["string array (optional, mcq|true_false|short_answer)"],
  "topics": ["string array (optional, each max 100 chars)"]
}
```

**Response**:
```json

```

### Adjust Quiz Difficulty Real-time
**POST** `/api/quiz/adjust-difficulty`  
**Authentication**: Required  
**Rate Limit**: 50 requests per 15 minutes  
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
  "adjustmentType": "string (required, increase|decrease|maintain)"
}
```

**Response**:
```json

```

---

## API Testing Flows

### Flow 1: Create and Take a Quiz
1. **Authentication**: Login via Auth Service to get Bearer token
2. **Create Quiz**: `POST /api/quiz` with quiz data
3. **Get Quiz**: `GET /api/quiz/:quizId` to verify creation
4. **Submit Quiz**: `POST /api/quiz/:quizId/submit` with answers

### Flow 2: Generate AI-Powered Quiz
1. **Authentication**: Login via Auth Service to get Bearer token
2. **Generate Quiz**: `POST /api/quiz/generate` with AI generation parameters
3. **Take Quiz**: Use returned quiz data to submit answers

### Flow 3: Get Hints During Quiz
1. **Authentication**: Login via Auth Service to get Bearer token
2. **Start Quiz**: `GET /api/quiz/:quizId` to get quiz data
3. **Request Hint**: `POST /api/quiz/:quizId/question/:questionId/hint` for specific questions
4. **Submit Quiz**: `POST /api/quiz/:quizId/submit` with hint usage tracked

### Flow 4: Adaptive Learning Experience
1. **Authentication**: Login via Auth Service to get Bearer token
2. **Create Adaptive Quiz**: `POST /api/quiz/adaptive` with learning parameters
3. **Real-time Adjustment**: `POST /api/quiz/adjust-difficulty` during quiz session
4. **Get Suggestions**: `GET /api/quiz/suggestions` for personalized improvement

**Example Postman Testing**:
- **Base URL**: `http://localhost:3002`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Flow**: Auth → Create/Generate Quiz → Take Quiz → Get Analytics

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
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error
