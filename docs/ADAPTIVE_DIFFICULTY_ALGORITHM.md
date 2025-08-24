# Adaptive Question Difficulty Algorithm

## Overview

The Quizzer application implements a sophisticated adaptive difficulty system that adjusts question difficulty both during initial quiz generation and in real-time during quiz sessions. This system uses multiple machine learning-inspired algorithms to provide personalized learning experiences.

## Features

### 1. Initial Adaptive Quiz Generation
- **Smart Difficulty Distribution**: Balances easy/medium/hard questions based on past performance
- **Subject-Specific Analysis**: Considers user's historical performance in specific subjects
- **Performance Trends**: Analyzes improvement patterns and consistency scores
- **Confidence-Based Adjustments**: Uses confidence levels to determine adjustment magnitude

### 2. Real-Time Difficulty Adjustment
- **Live Performance Monitoring**: Tracks current session performance metrics
- **Multi-Factor Analysis**: Considers accuracy, speed, hint usage, and consistency
- **Dynamic Recommendations**: Provides instant feedback on difficulty adjustments
- **Session-Aware Decisions**: Adjusts strategy based on remaining questions

## Algorithm Components

### Performance Analysis Factors

#### 1. Performance Score (0-100)
```typescript
performanceScore = weightedAverage(
  overallAccuracy * 0.4,
  subjectSpecificAccuracy * 0.3,
  recentPerformance * 0.2,
  consistencyBonus * 0.1
)
```

#### 2. Consistency Score (0-100)
Measures stability of performance across quiz sessions:
```typescript
consistencyScore = 1 - variance(performanceWindows) * 2
```

#### 3. Improvement Trend (-50 to +50)
Tracks whether user is improving or declining:
```typescript
improvementTrend = recentAccuracy - historicalAccuracy
```

#### 4. Subject Familiarity (0-100)
Evaluates user's experience with specific subjects:
```typescript
subjectFamiliarity = min(100, (subjectQuizCount / 5) * 50 + subjectAvgScore * 0.5)
```

### Difficulty Distribution Algorithm

The system calculates optimal difficulty distribution using:

```typescript
function calculateDistribution(factors, requestedDifficulty) {
  let easyRatio = 0.4;  // Default base
  let mediumRatio = 0.4;
  let hardRatio = 0.2;

  // Adjust based on performance score
  if (factors.performanceScore >= 80) {
    hardRatio += 0.2;
    easyRatio -= 0.15;
    mediumRatio -= 0.05;
  } else if (factors.performanceScore <= 40) {
    easyRatio += 0.2;
    hardRatio -= 0.15;
    mediumRatio -= 0.05;
  }

  // Consider improvement trend
  if (factors.improvementTrend > 10) {
    hardRatio += 0.1;
    easyRatio -= 0.1;
  } else if (factors.improvementTrend < -10) {
    easyRatio += 0.1;
    hardRatio -= 0.1;
  }

  // Apply consistency adjustments
  if (factors.consistencyScore < 50) {
    // Less consistent users get more gradual difficulty
    mediumRatio += 0.1;
    hardRatio -= 0.05;
    easyRatio -= 0.05;
  }

  return normalizeDistribution({ easy: easyRatio, medium: mediumRatio, hard: hardRatio });
}
```

### Real-Time Adjustment Algorithm

#### Decision Matrix

The real-time system uses a scoring approach:

```typescript
function calculateAdjustmentScore(analysis, remainingQuestions) {
  let score = 0;

  // Accuracy factor (most important - 40% weight)
  if (analysis.recentAccuracy >= 0.8) score += 0.4;
  else if (analysis.recentAccuracy <= 0.4) score -= 0.4;

  // Speed factor (15% weight)
  score += analyzeSpeedPattern(analysis.averageTime, analysis.recentAverageTime) * 0.15;

  // Hint usage factor (15% weight)
  if (analysis.hintUsageRate >= 0.5) score -= 0.15;
  else if (analysis.hintUsageRate <= 0.2) score += 0.1;

  // Consistency and trend (20% weight combined)
  score += analysis.consistencyScore * 0.1;
  score += analysis.improvementTrend * 0.1;

  // End-of-quiz conservative factor
  if (remainingQuestions <= 3) score *= 0.7;

  return clamp(score, -1, 1);
}
```

#### Decision Thresholds

- **Make Harder**: `adjustmentScore >= 0.7` and `remainingQuestions >= 3`
- **Make Easier**: `adjustmentScore <= -0.7` and `remainingQuestions >= 3`
- **Maintain**: All other cases

### Performance Metrics Tracking

#### Session Metrics
```typescript
interface SessionMetrics {
  correctPercentage: number;           // Overall accuracy this session
  averageTimePerQuestion: number;      // Speed indicator
  hintsUsed: number;                   // Struggle indicator
  totalAnswered: number;               // Progress indicator
  consistencyScore: number;            // Stability measure
  improvementTrend: number;            // Learning progress
}
```

#### Historical Performance
```typescript
interface UserPerformanceData {
  averageScore: number;                // Overall performance
  totalQuizzes: number;                // Experience level
  subjectPerformance: Record<string, { // Subject-specific data
    averageScore: number;
    totalQuizzes: number;
    lastAttempt?: Date;
  }>;
  difficultyPerformance: {             // Performance by difficulty
    easy: { correct: number; total: number; avgTime: number };
    medium: { correct: number; total: number; avgTime: number };
    hard: { correct: number; total: number; avgTime: number };
  };
  strongSubjects: string[];            // Identified strengths
  weakSubjects: string[];              // Areas for improvement
}
```

## API Endpoints

### 1. Create Adaptive Quiz
```http
POST /api/quiz/adaptive
Authorization: Bearer <token>
Content-Type: application/json

{
  "grade": 10,
  "subject": "Mathematics",
  "totalQuestions": 15,
  "topics": ["algebra", "geometry"],
  "timeLimit": 30,
  "difficulty": "mixed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quiz": {
      "_id": "quiz_id",
      "title": "Adaptive Mathematics Quiz - Grade 10",
      "metadata": {
        "difficulty": "adaptive",
        "adaptiveMetadata": {
          "difficultyDistribution": {
            "easy": 0.3,
            "medium": 0.5,
            "hard": 0.2
          },
          "confidenceLevel": "medium",
          "adaptationFactors": {
            "performanceScore": 72,
            "consistencyScore": 65,
            "improvementTrend": 8,
            "subjectFamiliarity": 80
          }
        }
      },
      "questions": [...],
      "adaptiveInfo": {
        "reasoning": [
          "Strong subject familiarity detected",
          "Consistent improvement trend",
          "Balanced difficulty distribution recommended"
        ]
      }
    }
  }
}
```

### 2. Real-Time Difficulty Adjustment
```http
POST /api/quiz/adjust-difficulty
Authorization: Bearer <token>
Content-Type: application/json

{
  "quizId": "quiz_id",
  "currentAnswers": [
    {
      "questionId": "q1",
      "userAnswer": "option_a",
      "isCorrect": true,
      "pointsEarned": 1,
      "timeSpent": 45,
      "hintsUsed": 0
    }
  ],
  "remainingQuestions": 8,
  "currentDifficulty": "medium",
  "subject": "Mathematics",
  "timeRemaining": 1200
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "adjustment": "harder",
    "currentDifficulty": "medium",
    "recommendedDifficulty": "hard",
    "sessionMetrics": {
      "correctPercentage": 85,
      "averageTimePerQuestion": 42,
      "hintsUsed": 1,
      "totalAnswered": 7
    },
    "recommendations": [
      "Performance is strong - increasing difficulty to maintain engagement",
      "Excellent speed and accuracy"
    ],
    "shouldAdjust": true,
    "nextQuestionGuidance": {
      "difficulty": "hard",
      "focusAreas": ["challenging problem-solving"],
      "confidenceBooster": true
    }
  }
}
```

## Configuration

### Tunable Parameters

```typescript
const ALGORITHM_CONFIG = {
  // Performance thresholds
  HIGH_PERFORMANCE_THRESHOLD: 80,
  LOW_PERFORMANCE_THRESHOLD: 40,
  
  // Adjustment thresholds
  HARDER_THRESHOLD: 0.7,
  EASIER_THRESHOLD: -0.7,
  
  // Weight factors
  ACCURACY_WEIGHT: 0.4,
  SPEED_WEIGHT: 0.15,
  HINT_WEIGHT: 0.15,
  CONSISTENCY_WEIGHT: 0.1,
  TREND_WEIGHT: 0.1,
  
  // Conservative factors
  END_QUIZ_MODIFIER: 0.7,
  MIN_ANSWERS_FOR_ADJUSTMENT: 2,
  MIN_REMAINING_FOR_ADJUSTMENT: 3,
  
  // Time thresholds (seconds)
  BASELINE_TIME: 90,
  SLOW_TIME_MULTIPLIER: 1.5,
  
  // Subject familiarity
  EXPERIENCE_QUIZ_COUNT: 5,
  MAX_FAMILIARITY_SCORE: 100
};
```

## Benefits

1. **Personalized Learning**: Each user gets questions appropriate to their skill level
2. **Engagement Optimization**: Maintains optimal challenge level to prevent boredom or frustration
3. **Adaptive Progression**: Difficulty evolves with user's improving skills
4. **Real-Time Feedback**: Immediate adjustments keep users in their learning zone
5. **Data-Driven Decisions**: Uses comprehensive performance analytics
6. **Subject Awareness**: Considers domain-specific performance patterns

## Future Enhancements

1. **Machine Learning Integration**: Use ML models for more sophisticated predictions
2. **Learning Style Adaptation**: Adjust question types based on user preferences
3. **Emotional State Consideration**: Factor in user frustration or confidence levels
4. **Collaborative Filtering**: Use similar users' data for better recommendations
5. **Long-term Learning Path**: Create personalized learning trajectories
6. **A/B Testing Framework**: Continuously optimize algorithm parameters

## Monitoring and Analytics

The system provides comprehensive analytics:

- **Algorithm Performance**: Track adjustment accuracy and user satisfaction
- **Learning Outcomes**: Measure improvement rates with adaptive vs. static quizzes
- **Engagement Metrics**: Monitor completion rates and time spent
- **Difficulty Distribution**: Analyze optimal distributions per subject/grade
- **Real-time Effectiveness**: Measure accuracy of real-time adjustments

This adaptive difficulty system creates a truly personalized learning experience that grows with each user's progress and helps maintain optimal challenge levels for maximum learning effectiveness.
