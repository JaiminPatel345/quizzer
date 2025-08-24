# Submission Service API Documentation - Live on Azure! 🚀

## 🌐 Live Service URL
**Base URL**: http://quizzer-submission-1756068070.southindia.azurecontainer.io:3004
**Health Check**: http://quizzer-submission-1756068070.southindia.azurecontainer.io:3004/health

**Port**: 3004  
**Authentication**: Bearer token required for all endpoints  
**Dependencies**: Auth Service for authentication, Quiz Service, AI Service

## 🧪 Quick Test
```bash
# Test the live service
curl http://quizzer-submission-1756068070.southindia.azurecontainer.io:3004/health
```

---

## Table of Contents
1. [Health & Info Endpoints](#health--info-endpoints)
2. [Quiz Submission Endpoints](#quiz-submission-endpoints)
3. [Submission History Endpoints](#submission-history-endpoints)
4. [Quiz Retry & Attempts Endpoints](#quiz-retry--attempts-endpoints)
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

## Quiz Submission Endpoints

### Submit Quiz
**POST** `/api/submission/submit`  
**Authentication**: Required  
**Rate Limit**: 30 requests per 15 minutes  
**Request Body**:
```json
{
  "quizId": "string (required, MongoDB ObjectId)",
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

**Response**:
```json

```

---

## Submission History Endpoints

### Get User Submissions
**GET** `/api/submission`  
**Authentication**: Required  
**Rate Limit**: 100 requests per 15 minutes  
**Query Parameters**:
- `quizId`: string (MongoDB ObjectId, optional)
- `grade`: number (1-12, optional)
- `subject`: string (optional)
- `difficulty`: string (easy|medium|hard|mixed, optional)
- `startDate`: string (ISO date, optional)
- `endDate`: string (ISO date, optional)
- `minScore`: number (0-100, optional)
- `maxScore`: number (0-100, optional)
- `page`: number (default: 1)
- `limit`: number (default: 10, max: 100)
- `sortBy`: string (submittedAt|score|timeSpent, default: submittedAt)
- `sortOrder`: string (asc|desc, default: desc)

**Response**:
```json

```

### Get Specific Submission
**GET** `/api/submission/:submissionId`  
**Authentication**: Required  
**Rate Limit**: 100 requests per 15 minutes  
**Parameters**:
- `submissionId`: string (MongoDB ObjectId, required)

**Response**:
```json

```

### Get Submission Details with Explanations
**GET** `/api/submission/:submissionId/details`  
**Authentication**: Required  
**Rate Limit**: 100 requests per 15 minutes  
**Parameters**:
- `submissionId`: string (MongoDB ObjectId, required)

**Response**:
```json

```

---

## Quiz Retry & Attempts Endpoints

### Get All Quiz Attempts
**GET** `/api/submission/quiz/:quizId/attempts`  
**Authentication**: Required  
**Rate Limit**: 100 requests per 15 minutes  
**Parameters**:
- `quizId`: string (MongoDB ObjectId, required)

**Query Parameters**:
- `page`: number (default: 1)
- `limit`: number (default: 10, max: 50)
- `sortBy`: string (submittedAt|score|attemptNumber, default: submittedAt)
- `sortOrder`: string (asc|desc, default: desc)

**Response**:
```json

```

### Retry Quiz (New Attempt)
**POST** `/api/submission/quiz/:quizId/retry`  
**Authentication**: Required  
**Rate Limit**: 30 requests per 15 minutes  
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

**Response**:
```json

```

### Get Best Attempt for Quiz
**GET** `/api/submission/quiz/:quizId/best`  
**Authentication**: Required  
**Rate Limit**: 100 requests per 15 minutes  
**Parameters**:
- `quizId`: string (MongoDB ObjectId, required)

**Query Parameters**:
- `metric`: string (score|timeSpent|efficiency, default: score)

**Response**:
```json

```

### Compare Quiz Attempts
**GET** `/api/submission/quiz/:quizId/compare`  
**Authentication**: Required  
**Rate Limit**: 100 requests per 15 minutes  
**Parameters**:
- `quizId`: string (MongoDB ObjectId, required)

**Query Parameters**:
- `attempt1`: string (MongoDB ObjectId, required)
- `attempt2`: string (MongoDB ObjectId, required)
- `includeDetails`: boolean (default: false)

**Response**:
```json

```

---

## API Testing Flows

### Flow 1: Submit and Track Quiz
1. **Authentication**: Login via Auth Service to get Bearer token
2. **Take Quiz**: Get quiz from Quiz Service
3. **Submit Answers**: `POST /api/submission/submit` with user responses
4. **Check Results**: `GET /api/submission/:submissionId` to view results

### Flow 2: Quiz Retry Flow
1. **Authentication**: Login via Auth Service to get Bearer token
2. **View Previous Attempts**: `GET /api/submission/quiz/:quizId/attempts`
3. **Retry Quiz**: `POST /api/submission/quiz/:quizId/retry` with new answers
4. **Compare Performance**: `GET /api/submission/quiz/:quizId/compare` with attempt IDs

### Flow 3: Performance Analysis
1. **Authentication**: Login via Auth Service to get Bearer token
2. **Get Submission History**: `GET /api/submission` with filters
3. **Get Best Attempt**: `GET /api/submission/quiz/:quizId/best` for specific quiz
4. **Detailed Analysis**: `GET /api/submission/:submissionId/details` for explanations

### Flow 4: AI-Enhanced Submission
1. **Authentication**: Login via Auth Service to get Bearer token
2. **Submit with AI Evaluation**: `POST /api/submission/submit` with `requestEvaluation: true`
3. **Get AI Insights**: Results include AI-generated feedback and suggestions

**Example Postman Testing**:
- **Base URL**: `http://localhost:3004`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Flow**: Auth → Take Quiz → Submit → Analyze Results → Retry if needed

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
- `201` - Created (submission successful)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden (quiz access denied)
- `404` - Not Found (submission/quiz not found)
- `409` - Conflict (submission already exists)
- `429` - Too Many Requests
- `500` - Internal Server Error

**Rate Limits**:
- **Submission endpoints**: 30 requests per 15 minutes
- **Query endpoints**: 100 requests per 15 minutes
