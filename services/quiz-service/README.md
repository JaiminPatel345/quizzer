# Quiz Service API Documentation

**Base URL**: `http://localhost:3002`  
**Port**: 3002  
**Authentication**: Bearer token required for protected endpoints  
**Dependencies**: Auth Service for authentication

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
    "timestamp": "2025-08-23T18:13:21.672Z"
}
```
---

## Quiz Management Endpoints

### Get previously generated Quizzes (List with Filtering)
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
**GET** `/api/quiz/{quizId}`  
**Authentication**: Optional (required for private quizzes)  
**Parameters**:
- `quizId`: string (MongoDB ObjectId, required)
  **Response**:
```json

```

### Create Quiz
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
**Response**:
```json

```

### Update Quiz Metadata
**PUT** `/api/quiz/{quizId}`  
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

### Delete Quiz (Soft Delete)
**DELETE** `/api/quiz/{quizId}`  
**Authentication**: Required (must be quiz creator)  
**Rate Limit**: 50 requests per 15 minutes  
**Parameters**:
- `quizId`: string (MongoDB ObjectId, required)
  **Response**:
```json

```

### Duplicate Quiz
**POST** `/api/quiz/{quizId}/duplicate`  
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
**Response**:
```json

```

## Error Responses

All endpoints return consistent error format:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "functionName": "methodName", 
    "timestamp": "2025-08-23T16:00:00.000Z",
    "details": "Additional error details (when applicable)"
  }
}
```

**Common HTTP Status Codes**:
- `200` - Success
- `201` - Created (quiz created)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (not quiz owner)
- `404` - Not Found (quiz not found)
- `409` - Conflict
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Rate Limits

- **Quiz operations**: 50 requests per 15 minutes per IP
- **General endpoints**: 100 requests per 15 minutes per IP

When rate limit is exceeded:
```json
{
  "success": false,
  "error": {
    "message": "Too many quiz requests, please try again later.",
    "code": "QUIZ_RATE_LIMIT_EXCEEDED"
  }
}
```

## Validation Rules

### Quiz Metadata
- **grade**: Must be integer between 1-12
- **subject**: 2-100 characters, required
- **totalQuestions**: Must match actual questions array length
- **timeLimit**: 5-180 minutes
- **difficulty**: One of easy|medium|hard|mixed

### Questions Array
- **Minimum**: 1 question required
- **Maximum**: 50 questions allowed
- **questionId**: Must be unique within quiz
- **MCQ questions**: Must have 2-6 options
- **True/False questions**: Options array can be empty
- **Short Answer**: Options array can be empty

### Access Control
- **Public quizzes**: Visible to all users
- **Private quizzes**: Only visible to creator and authenticated users in list view
- **Quiz details**: Private quizzes require authentication and ownership/public status
- **Modifications**: Only quiz creator can update/delete their quizzes

***

# Changes Needed After All Microservices

## 1. Service Integration Issues

### Missing Import in Auth Service
**File**: `services/auth-service/src/app.ts`
**Issue**: User routes not properly imported
**Fix**: Add proper user routes import:
```typescript
import userRoutes from './routes/user.js';

// In initializeRoutes() method:
this.app.use('/api/user', userRoutes);  // Not /api/auth
```

### Database Connection Import Missing
**File**: All service `src/index.ts` files
**Issue**: Missing mongoose import for graceful shutdown
**Fix**: Add import:
```typescript
import mongoose from 'mongoose';
```

## 2. Service Client Configuration

### Environment Variables Consistency
**Issue**: Service URLs need to be consistent across all services
**Fix**: Update all `.env.example` files to include all service URLs:
```bash
AUTH_SERVICE_URL=http://localhost:3001
QUIZ_SERVICE_URL=http://localhost:3002
AI_SERVICE_URL=http://localhost:3003
SUBMISSION_SERVICE_URL=http://localhost:3004
ANALYTICS_SERVICE_URL=http://localhost:3005
```

## 3. Cross-Service Authentication

### Token Validation Headers
**Issue**: Service-to-service calls need proper header forwarding
**Fix**: Update all service client calls to forward Authorization headers:
```typescript
// In all service controllers making external calls
const authHeader = req.headers.authorization;
const response = await serviceClient.get('/endpoint', {
  headers: authHeader ? { Authorization: authHeader } : {}
});
```

## 4. Database Naming Consistency

### Database Names
**Current**: Mixed naming conventions
**Fix**: Standardize database names:
```bash
quiz_auth_db → quiz-auth-db
quiz_content_db → quiz-content-db  
quiz_ai_db → quiz-ai-db
quiz_submissions_db → quiz-submissions-db
quiz_analytics_db → quiz-analytics-db
```

## 5. Validation Schema Updates

### Options Field Validation
**Issue**: Your corrected validation for MCQ options
**Fix**: Apply to all services with question validation:
```typescript
options: Joi.array()
  .items(Joi.string().trim().max(200))
  .when('questionType', {
    is: 'mcq',
    then: Joi.array()
      .items(Joi.string().trim().max(200))
      .required()
      .min(2)
      .max(6),
    otherwise: Joi.optional()
  })
```

## 6. Root Package.json Updates

**File**: `package.json` (root)
**Fix**: Update workspace scripts:
```json
{
  "scripts": {
    "dev": "concurrently \"cd services/auth-service && yarn dev\" \"cd services/quiz-service && yarn dev\" \"cd services/ai-service && yarn dev\" \"cd services/submission-service && yarn dev\" \"cd services/analytics-service && yarn dev\"",
    "build:all": "yarn workspaces run build",
    "test:all": "yarn workspaces run test"
  }
}
```
