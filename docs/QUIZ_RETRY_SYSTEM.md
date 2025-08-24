# Quiz Retry and Attempt Management System

## Overview

The Quiz Retry and Attempt Management System allows users to retake quizzes multiple times with comprehensive tracking, comparison, and analytics. This system maintains complete history of all attempts while providing detailed insights into performance progression.

## Features

### 1. **Quiz Retry Functionality**
- **Multiple Attempts**: Users can retake any quiz unlimited times
- **Score Re-evaluation**: Each attempt is scored independently with current algorithm
- **Progressive Tracking**: Automatic attempt numbering and tracking
- **Improvement Analytics**: Detailed comparison between attempts

### 2. **Attempt History Management**
- **Complete History**: Access to all previous attempts for any quiz
- **Flexible Sorting**: Sort by attempt number, score, or date
- **Performance Analytics**: Comprehensive statistics and trends
- **Best Attempt Tracking**: Easy access to highest-scoring attempt

### 3. **Comparison and Analytics**
- **Attempt Comparison**: Side-by-side comparison of any two attempts
- **Question-level Analysis**: Detailed breakdown of improvements per question
- **Trend Analysis**: Performance improvement/decline patterns
- **Consistency Scoring**: Stability metrics across attempts

## API Endpoints

### 1. Retry a Quiz
```http
POST /api/submission/quiz/{quizId}/retry
Authorization: Bearer <token>
Content-Type: application/json

{
  "answers": [
    {
      "questionId": "q1",
      "userAnswer": "option_a",
      "timeSpent": 45,
      "hintsUsed": 0
    }
  ],
  "startedAt": "2025-08-24T10:00:00.000Z",
  "submittedAt": "2025-08-24T10:30:00.000Z",
  "requestEvaluation": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Quiz retry submitted successfully",
  "data": {
    "submission": {
      "_id": "submission_id",
      "attemptNumber": 2,
      "scoring": {
        "totalQuestions": 10,
        "correctAnswers": 8,
        "totalPoints": 8,
        "scorePercentage": 80,
        "grade": "B"
      },
      "timing": {
        "startedAt": "2025-08-24T10:00:00.000Z",
        "submittedAt": "2025-08-24T10:30:00.000Z",
        "totalTimeSpent": 1800
      },
      "aiEvaluation": {
        "suggestions": ["Focus on algebra concepts", "Practice more word problems"],
        "strengths": ["Good understanding of geometry"],
        "weaknesses": ["Calculation errors in fractions"]
      }
    },
    "improvement": {
      "scoreChange": 15,
      "timeChange": -300,
      "gradeChange": 1,
      "isImprovement": true
    },
    "comparison": {
      "previousAttempt": {
        "attemptNumber": 1,
        "score": 65,
        "grade": "C",
        "date": "2025-08-23T15:00:00.000Z"
      },
      "currentAttempt": {
        "attemptNumber": 2,
        "score": 80,
        "grade": "B",
        "date": "2025-08-24T10:30:00.000Z"
      }
    }
  }
}
```

### 2. Get All Attempts for a Quiz
```http
GET /api/submission/quiz/{quizId}/attempts?sortBy=score&order=desc&includeDetails=true
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Quiz attempts retrieved successfully",
  "data": {
    "attempts": [
      {
        "_id": "attempt2_id",
        "attemptNumber": 2,
        "scoring": {
          "scorePercentage": 80,
          "grade": "B"
        },
        "timing": {
          "submittedAt": "2025-08-24T10:30:00.000Z",
          "totalTimeSpent": 1800
        }
      },
      {
        "_id": "attempt1_id", 
        "attemptNumber": 1,
        "scoring": {
          "scorePercentage": 65,
          "grade": "C"
        },
        "timing": {
          "submittedAt": "2025-08-23T15:00:00.000Z",
          "totalTimeSpent": 2100
        }
      }
    ],
    "totalAttempts": 2,
    "bestAttempt": {
      "attemptNumber": 2,
      "score": 80,
      "grade": "B",
      "date": "2025-08-24T10:30:00.000Z"
    },
    "latestAttempt": {
      "attemptNumber": 2,
      "score": 80,
      "grade": "B", 
      "date": "2025-08-24T10:30:00.000Z"
    },
    "analytics": {
      "scoreProgression": [
        { "attemptNumber": 1, "score": 65, "date": "2025-08-23T15:00:00.000Z" },
        { "attemptNumber": 2, "score": 80, "date": "2025-08-24T10:30:00.000Z" }
      ],
      "improvementTrend": 15,
      "averageScore": 72.5,
      "totalTimeSpent": 3900,
      "consistencyScore": 85.2
    }
  }
}
```

### 3. Get Best Attempt
```http
GET /api/submission/quiz/{quizId}/best
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Best attempt retrieved successfully",
  "data": {
    "bestAttempt": {
      "_id": "best_attempt_id",
      "attemptNumber": 3,
      "scoring": {
        "totalQuestions": 10,
        "correctAnswers": 9,
        "totalPoints": 9,
        "scorePercentage": 90,
        "grade": "A"
      },
      "timing": {
        "submittedAt": "2025-08-25T14:00:00.000Z",
        "totalTimeSpent": 1650
      },
      "aiEvaluation": {
        "suggestions": ["Excellent progress!", "Minor improvement in timing"],
        "strengths": ["Strong grasp of all concepts"],
        "weaknesses": ["Slight hesitation on complex problems"]
      }
    },
    "totalAttempts": 3,
    "isBestScore": true
  }
}
```

### 4. Compare Two Attempts
```http
GET /api/submission/quiz/{quizId}/compare?attempt1=1&attempt2=2
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Attempt comparison retrieved successfully",
  "data": {
    "quizId": "quiz_id",
    "comparison": {
      "score": {
        "attempt1Score": 65,
        "attempt2Score": 80,
        "scoreDifference": 15,
        "improvement": true
      },
      "time": {
        "attempt1Time": 2100,
        "attempt2Time": 1800,
        "timeDifference": -300,
        "fasterCompletion": true
      },
      "grade": {
        "attempt1Grade": "C",
        "attempt2Grade": "B",
        "gradeImprovement": 1
      },
      "questions": {
        "totalQuestions": 10,
        "improved": 3,
        "worsened": 1,
        "unchanged": 6,
        "details": [
          {
            "questionId": "q1",
            "attempt1": {
              "answer": "option_b",
              "correct": false,
              "points": 0,
              "timeSpent": 120
            },
            "attempt2": {
              "answer": "option_a",
              "correct": true,
              "points": 1,
              "timeSpent": 90
            },
            "status": "improved"
          }
        ]
      }
    }
  }
}
```

## Database Schema Enhancements

### Submission Model Updates
```typescript
interface ISubmission {
  _id: ObjectId;
  quizId: ObjectId;
  userId: ObjectId;
  attemptNumber: number;           // Auto-incremented for each quiz retry
  answers: SubmissionAnswer[];
  scoring: SubmissionScoring;
  timing: SubmissionTiming;
  aiEvaluation?: AIEvaluation;
  metadata: SubmissionMetadata;    // Enhanced with retry information
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SubmissionMetadata {
  ipAddress: string;
  userAgent: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  grade?: number;
  subject?: string;
  isRetry?: boolean;              // NEW: Indicates if this is a retry attempt
  previousAttempt?: ObjectId;     // NEW: Reference to previous attempt
}
```

### Database Indexes
```typescript
// Ensures unique attempt numbers per user-quiz combination
{ userId: 1, quizId: 1, attemptNumber: 1 } // unique: true

// Optimizes queries for user submission history
{ userId: 1, 'timing.submittedAt': -1 }

// Optimizes quiz-specific attempt queries
{ quizId: 1 }

// Optimizes score-based queries
{ 'scoring.scorePercentage': -1 }

// Optimizes completion status queries
{ isCompleted: 1 }
```

## Analytics and Insights

### Performance Metrics
```typescript
interface PerformanceAnalytics {
  totalAttempts: number;
  firstScore: number;
  latestScore: number;
  bestScore: number;
  averageScore: number;
  improvementTrend: number;        // Positive = improving, Negative = declining
  consistencyScore: number;        // 0-100, higher = more consistent
  totalTimeSpent: number;
  averageTimePerAttempt: number;
  textualInsights: string[];       // Human-readable insights
}
```

### Improvement Calculation Algorithm
```typescript
// Linear trend analysis
function calculateImprovementTrend(attempts: Attempt[]): number {
  const scores = attempts.map(a => a.scoring.scorePercentage);
  const n = scores.length;
  
  // Calculate linear regression slope
  const sumX = n * (n + 1) / 2;
  const sumY = scores.reduce((sum, score) => sum + score, 0);
  const sumXY = scores.reduce((sum, score, index) => sum + score * (index + 1), 0);
  const sumX2 = n * (n + 1) * (2 * n + 1) / 6;
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}
```

### Consistency Scoring
```typescript
function calculateConsistencyScore(attempts: Attempt[]): number {
  if (attempts.length < 2) return 100;
  
  const scores = attempts.map(a => a.scoring.scorePercentage);
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Convert to consistency score (0-100, where 100 is perfectly consistent)
  return Math.max(0, 100 - (standardDeviation / mean) * 100);
}
```

## Validation Rules

### Quiz Retry Validation
- **Previous Attempts Required**: Must have at least one previous attempt
- **Valid Answers**: All answers must be properly formatted
- **Time Validation**: `submittedAt` must be after `startedAt`
- **Reasonable Duration**: Maximum 2 hours per question
- **Hint Limits**: Maximum 10 hints per question

### Comparison Validation
- **Valid Attempt Numbers**: Both attempts must exist
- **Different Attempts**: Cannot compare the same attempt
- **User Authorization**: Can only compare own attempts
- **Completed Attempts**: Only completed submissions can be compared

## Security and Authorization

### Access Control
- **User Authentication**: All endpoints require valid JWT token
- **User Isolation**: Users can only access their own attempts
- **Rate Limiting**: Submission retry has stricter rate limits
- **Input Validation**: Comprehensive validation on all inputs

### Data Privacy
- **Personal Data**: No sharing of attempt data between users
- **Anonymous Analytics**: Aggregate data for system improvements
- **Audit Trail**: Complete tracking of all retry activities

## Usage Patterns

### Common Workflows

#### 1. Student Improvement Cycle
```javascript
// 1. Check previous attempts
const attempts = await fetch('/api/submission/quiz/123/attempts');

// 2. Retry quiz with new answers
const retry = await fetch('/api/submission/quiz/123/retry', {
  method: 'POST',
  body: JSON.stringify({ answers, startedAt, submittedAt })
});

// 3. Compare with previous attempt
const comparison = await fetch('/api/submission/quiz/123/compare?attempt1=1&attempt2=2');
```

#### 2. Performance Tracking
```javascript
// Get best performance for gradebook
const bestAttempt = await fetch('/api/submission/quiz/123/best');

// Get improvement trends for analytics
const attempts = await fetch('/api/submission/quiz/123/attempts?sortBy=date');
```

#### 3. Learning Analytics
```javascript
// Get comprehensive performance data
const attempts = await fetch('/api/submission/quiz/123/attempts?includeDetails=true');

// Extract learning insights
const insights = SubmissionAnalytics.generatePerformanceInsights(attempts.data.attempts);
```

## Benefits

### For Students
1. **Learning Reinforcement**: Multiple attempts reinforce learning
2. **Progress Tracking**: Clear visualization of improvement
3. **Detailed Feedback**: Comprehensive analysis of performance
4. **Flexible Learning**: Retry at their own pace

### For Educators  
1. **Learning Analytics**: Detailed insights into student progress
2. **Adaptive Teaching**: Identify areas needing more focus
3. **Assessment Flexibility**: Allow retakes for formative assessment
4. **Progress Monitoring**: Track individual and class improvement

### For System
1. **Rich Data**: Comprehensive learning analytics
2. **Engagement**: Increased user engagement through retries
3. **Adaptive Content**: Data for improving quiz difficulty
4. **Performance Insights**: Understanding of learning patterns

This retry system transforms quizzes from single-shot assessments into powerful learning tools that support continuous improvement and provide rich insights into the learning process.
