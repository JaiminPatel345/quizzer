# Analytics Service API Documentation

**Base URL**: `http://localhost:3005`  
**Port**: 3005  
**Authentication**: Bearer token required for protected endpoints  
**Dependencies**: Auth Service for authentication, Submission Service for data

---

## Table of Contents
1. [Health & Info Endpoints](#health--info-endpoints)
2. [User Performance Analytics](#user-performance-analytics)
3. [Leaderboard Endpoints](#leaderboard-endpoints)
4. [Performance Trends & Analysis](#performance-trends--analysis)
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

## User Performance Analytics

### Get Overall User Performance
**GET** `/api/analytics/performance`  
**Authentication**: Required  
**Rate Limit**: 100 requests per 15 minutes  
**Query Parameters**:
- `timeframe`: string (7d|30d|90d|1y|all, default: 30d)
- `includeDetails`: boolean (default: false)

**Response**:
```json

```

### Get Subject-Specific Performance
**GET** `/api/analytics/performance/:subject/:grade`  
**Authentication**: Required  
**Rate Limit**: 100 requests per 15 minutes  
**Parameters**:
- `subject`: string (required)
- `grade`: number (1-12, required)

**Query Parameters**:
- `timeframe`: string (7d|30d|90d|1y|all, default: 30d)
- `includeTopics`: boolean (default: false)

**Response**:
```json

```

### Get Performance Trends
**GET** `/api/analytics/trends`  
**Authentication**: Required  
**Rate Limit**: 100 requests per 15 minutes  
**Query Parameters**:
- `timeframe`: string (7d|30d|90d|1y, default: 30d)
- `granularity`: string (daily|weekly|monthly, default: daily)
- `subject`: string (optional)
- `grade`: number (1-12, optional)

**Response**:
```json

```

### Get Topic-wise Analysis
**GET** `/api/analytics/topics`  
**Authentication**: Required  
**Rate Limit**: 100 requests per 15 minutes  
**Query Parameters**:
- `subject`: string (optional)
- `grade`: number (1-12, optional)
- `timeframe`: string (7d|30d|90d|1y|all, default: 30d)
- `minAttempts`: number (default: 3)

**Response**:
```json

```

### Update User Performance (Internal API)
**POST** `/api/analytics/performance/update`  
**Authentication**: Required  
**Rate Limit**: 200 requests per 15 minutes  
**Request Body**:
```json
{
  "userId": "string (required, MongoDB ObjectId)",
  "submissionData": {
    "quizId": "string (required, MongoDB ObjectId)",
    "score": "number (required, 0-100)",
    "totalQuestions": "number (required, 1+)",
    "correctAnswers": "number (required, 0+)",
    "timeSpent": "number (required, 0+)",
    "subject": "string (required, 2-100 chars)",
    "grade": "number (required, 1-12)",
    "difficulty": "string (required, easy|medium|hard)",
    "topics": ["string array (optional)"],
    "submittedAt": "string (required, ISO date)"
  }
}
```

**Response**:
```json

```

---

## Leaderboard Endpoints

### Get Leaderboard
**GET** `/api/leaderboard`  
**Authentication**: Optional (affects user context in response)  
**Rate Limit**: 100 requests per 15 minutes  
**Query Parameters**:
- `subject`: string (optional)
- `grade`: number (1-12, optional)
- `timeframe`: string (7d|30d|90d|1y|all, default: 30d)
- `sortBy`: string (totalScore|averageScore|quizCount|efficiency, default: totalScore)
- `limit`: number (default: 10, max: 100)
- `includeStats`: boolean (default: false)
- `includeUserContext`: boolean (default: false, requires auth)

**Response**:
```json

```

### Get Top Performers
**GET** `/api/leaderboard/top`  
**Authentication**: None  
**Rate Limit**: 100 requests per 15 minutes  
**Query Parameters**:
- `subject`: string (optional)
- `grade`: number (1-12, optional)
- `limit`: number (default: 5, max: 20)
- `metric`: string (score|efficiency|consistency, default: score)

**Response**:
```json

```

### Get User's Rank
**GET** `/api/leaderboard/my-rank`  
**Authentication**: Required  
**Rate Limit**: 100 requests per 15 minutes  
**Query Parameters**:
- `subject`: string (optional)
- `grade`: number (optional)
- `timeframe`: string (7d|30d|90d|1y|all, default: 30d)
- `sortBy`: string (totalScore|averageScore|quizCount|efficiency, default: totalScore)

**Response**:
```json

```

---

## Performance Trends & Analysis

### Get Advanced Performance Metrics
**GET** `/api/analytics/metrics/advanced`  
**Authentication**: Required  
**Rate Limit**: 50 requests per 15 minutes  
**Query Parameters**:
- `timeframe`: string (7d|30d|90d|1y|all, default: 30d)
- `includeComparison`: boolean (default: false)
- `benchmarkType`: string (grade_average|subject_average|peer_group, optional)

**Response**:
```json

```

### Get Learning Progress Analysis
**GET** `/api/analytics/progress`  
**Authentication**: Required  
**Rate Limit**: 50 requests per 15 minutes  
**Query Parameters**:
- `subject`: string (optional)
- `grade`: number (1-12, optional)
- `timeframe`: string (7d|30d|90d|1y|all, default: 30d)
- `includeGoals`: boolean (default: false)

**Response**:
```json

```

### Get Weakness & Strength Analysis
**GET** `/api/analytics/analysis/strengths-weaknesses`  
**Authentication**: Required  
**Rate Limit**: 50 requests per 15 minutes  
**Query Parameters**:
- `timeframe`: string (7d|30d|90d|1y|all, default: 30d)
- `minAttempts`: number (default: 3)
- `includeRecommendations`: boolean (default: false)

**Response**:
```json

```

---

## API Testing Flows

### Flow 1: Basic Performance Analytics
1. **Authentication**: Login via Auth Service to get Bearer token
2. **Get Overall Performance**: `GET /api/analytics/performance`
3. **Get Subject Performance**: `GET /api/analytics/performance/:subject/:grade`
4. **View Trends**: `GET /api/analytics/trends` for progress tracking

### Flow 2: Leaderboard Exploration
1. **Optional Auth**: Can view public leaderboard without auth
2. **Get Leaderboard**: `GET /api/leaderboard` with filters
3. **Check User Rank**: `GET /api/leaderboard/my-rank` (requires auth)
4. **Top Performers**: `GET /api/leaderboard/top` for motivation

### Flow 3: Deep Performance Analysis
1. **Authentication**: Login via Auth Service to get Bearer token
2. **Advanced Metrics**: `GET /api/analytics/metrics/advanced`
3. **Learning Progress**: `GET /api/analytics/progress`
4. **Strengths/Weaknesses**: `GET /api/analytics/analysis/strengths-weaknesses`

### Flow 4: Performance Data Integration (Internal)
1. **Service Authentication**: Internal service token
2. **Update Performance**: `POST /api/analytics/performance/update` after quiz submission
3. **Trigger Analysis**: Analytics automatically recalculates metrics

**Example Postman Testing**:
- **Base URL**: `http://localhost:3005`
- **Headers**: `Authorization: Bearer <token>` (optional for some endpoints), `Content-Type: application/json`
- **Flow**: Submit Quizzes → View Analytics → Check Leaderboard → Analyze Progress

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
- `401` - Unauthorized (for protected endpoints)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (user/data not found)
- `429` - Too Many Requests
- `500` - Internal Server Error

**Rate Limits**:
- **General analytics**: 100 requests per 15 minutes
- **Advanced analytics**: 50 requests per 15 minutes
- **Performance updates**: 200 requests per 15 minutes

**Caching Headers**:
- `Cache-Control`: Indicates caching policy
- `X-Cache-Status`: HIT/MISS for leaderboard cache
- `X-Data-Freshness`: Timestamp of last data update
