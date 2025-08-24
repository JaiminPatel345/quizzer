# Leaderboard API Documentation

## Overview
The Leaderboard API provides comprehensive functionality to display top scores for grades/subjects, with advanced features including caching, user context, and statistics.

## Endpoints

### 1. Get Leaderboard
**GET** `/api/leaderboard`

Retrieves enhanced leaderboard data with filtering, sorting, and optional user context.

#### Query Parameters:
- `type` (string, default: 'overall'): Leaderboard type
  - `overall`: All users across all subjects/grades
  - `grade`: Filtered by specific grade
  - `subject`: Filtered by specific subject  
  - `grade_subject`: Filtered by both grade and subject
- `grade` (number, 1-12): Required when type is 'grade' or 'grade_subject'
- `subject` (string): Required when type is 'subject' or 'grade_subject'
- `timeframe` (string, default: 'all_time'): Time period
  - `all_time`: All historical data
  - `monthly`: Current month
  - `weekly`: Last 7 days
  - `daily`: Today only
- `limit` (number, 1-100, default: 50): Maximum number of rankings to return
- `includeUser` (string, default: 'false'): Include authenticated user's context
- `sortBy` (string, default: 'score'): Sorting criteria
  - `score`: Best score (default)
  - `average`: Average score
  - `consistency`: Score consistency
  - `quizzes`: Total quiz count

#### Response:
```json
{
  "success": true,
  "message": "Leaderboard retrieved successfully",
  "data": {
    "type": "grade_8_math_all_time",
    "criteria": {
      "type": "grade_subject",
      "grade": 8,
      "subject": "math",
      "timeframe": "all_time",
      "sortBy": "score"
    },
    "rankings": [
      {
        "rank": 1,
        "userId": "507f1f77bcf86cd799439011",
        "username": "student1",
        "score": 95.5,
        "averageScore": 92.3,
        "bestScore": 95.5,
        "totalQuizzes": 15,
        "lastAttemptDate": "2025-08-24T10:00:00Z",
        "consistency": 87,
        "badge": "🏆",
        "isCurrentUser": false
      }
    ],
    "metadata": {
      "totalParticipants": 150,
      "lastUpdated": "2025-08-24T12:00:00Z",
      "cacheExpiry": "2025-08-24T12:05:00Z",
      "isCached": false,
      "generationTime": 245,
      "criteria": { /* criteria object */ }
    },
    "userContext": {
      "userRank": 5,
      "userScore": 88.2,
      "rankingTrend": "up",
      "nearbyRankings": [/* nearby users */]
    },
    "statistics": {
      "averageScore": 76.4,
      "medianScore": 78.0,
      "topScore": 95.5,
      "participationRate": 45.2,
      "gradeDistribution": {
        "Grade 7": 25,
        "Grade 8": 45,
        "Grade 9": 30
      },
      "subjectDistribution": {
        "math": 60,
        "science": 40
      }
    }
  }
}
```

### 2. Get User Rank
**GET** `/api/leaderboard/my-rank`

Retrieves the authenticated user's current ranking position.

#### Query Parameters:
- `grade` (number, optional): Filter by grade
- `subject` (string, optional): Filter by subject
- `timeframe` (string, default: 'all_time'): Time period

#### Response:
```json
{
  "success": true,
  "message": "User rank retrieved successfully",
  "data": {
    "rank": 5,
    "score": 88.2,
    "totalQuizzes": 12,
    "totalParticipants": 150,
    "criteria": {
      "timeframe": "all_time",
      "grade": 8,
      "subject": "math"
    }
  }
}
```

### 3. Get Top Performers
**GET** `/api/leaderboard/top`

Retrieves a simplified list of top performers.

#### Query Parameters:
- `subject` (string, optional): Filter by subject
- `grade` (number, optional): Filter by grade
- `limit` (number, default: 10): Number of top performers

#### Response:
```json
{
  "success": true,
  "message": "Top performers retrieved successfully",
  "data": {
    "performers": [
      {
        "rank": 1,
        "userId": "507f1f77bcf86cd799439011",
        "username": "student1",
        "score": 95.5,
        "totalQuizzes": 15,
        "lastAttemptDate": "2025-08-24T10:00:00Z"
      }
    ],
    "criteria": {
      "timeframe": "all_time",
      "grade": 8,
      "subject": "math"
    },
    "totalParticipants": 150
  }
}
```

## Features

### 1. Enhanced Caching System
- **Database Caching**: Leaderboards are cached in MongoDB for 5 minutes
- **Cache Keys**: Generated based on criteria (type, grade, subject, timeframe, sortBy)
- **Smart Invalidation**: Cache is automatically refreshed when expired
- **Performance**: Cached responses include `isCached: true` flag

### 2. Advanced Sorting Options
- **Best Score**: Default sorting by highest score achieved
- **Average Score**: Sorting by average performance across all attempts
- **Consistency**: Sorting by score consistency (lower variance)
- **Quiz Count**: Sorting by total number of quizzes attempted

### 3. User Context Integration
When `includeUser=true` and user is authenticated:
- **User Rank**: Current position in the leaderboard
- **Ranking Trend**: Movement direction (up/down/stable/new)
- **Nearby Rankings**: Users ranked around the current user
- **User Highlighting**: Current user marked with `isCurrentUser: true`

### 4. Comprehensive Statistics
- **Score Analytics**: Average, median, and top scores
- **Participation Metrics**: Participation rate calculations
- **Distribution Data**: Grade and subject distribution charts
- **Performance Insights**: Trend analysis and recommendations

### 5. Badge System
- 🏆 1st place
- 🥈 2nd place
- 🥉 3rd place
- ⭐ Top 10
- 🎯 High consistency (80%+)

### 6. Flexible Filtering
- **Grade-based**: Filter by specific grade levels (1-12)
- **Subject-based**: Filter by academic subjects
- **Time-based**: All-time, monthly, weekly, or daily periods
- **Combined Filters**: Grade + Subject combinations

## Error Handling

### Common Error Responses:
```json
{
  "success": false,
  "error": {
    "message": "Grade must be between 1 and 12",
    "timestamp": "2025-08-24T12:00:00Z",
    "functionName": "getLeaderboard"
  }
}
```

### HTTP Status Codes:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (authentication required for user-specific features)
- `404`: Not Found (no data available)
- `500`: Internal Server Error

## Performance Considerations

### Optimization Features:
- **Aggregation Pipelines**: Efficient MongoDB queries with proper indexing
- **Limited Results**: Maximum 100 rankings per request
- **Caching Strategy**: 5-minute cache TTL for frequently accessed data
- **Selective Data**: Only necessary fields returned in responses

### Database Indexes:
- `{ type: 1, 'criteria.grade': 1, 'criteria.subject': 1 }`
- `{ 'metadata.cacheExpiry': 1 }`
- `{ 'metadata.lastUpdated': -1 }`

## Authentication

### Optional Authentication:
- **Public Access**: Basic leaderboard data accessible without authentication
- **Enhanced Features**: User context and personalized data require valid JWT token
- **Rate Limiting**: General rate limits applied to all endpoints

### Authorization Header:
```
Authorization: Bearer <jwt_token>
```

## Rate Limiting
- **General Limit**: 100 requests per 15 minutes per IP
- **Burst Protection**: Built-in rate limiting middleware
- **Fair Usage**: Automatic throttling for excessive requests

## Integration Notes

### Frontend Integration:
```javascript
// Get leaderboard for Grade 8 Math
const response = await fetch('/api/leaderboard?type=grade_subject&grade=8&subject=math&includeUser=true', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const leaderboard = await response.json();
```

### Service Communication:
- **Analytics Service**: Provides performance history data
- **User Service**: Supplies user information for rankings
- **Submission Service**: Sources quiz completion data
- **Cache Service**: Manages leaderboard caching

## Future Enhancements

### Planned Features:
- **Real-time Updates**: WebSocket integration for live leaderboard updates
- **Historical Rankings**: Track ranking changes over time
- **Achievement System**: Unlock badges and achievements
- **Social Features**: Friend comparisons and challenges
- **Export Capabilities**: PDF/Excel export of leaderboard data
