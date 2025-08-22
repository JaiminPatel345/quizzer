import type { Types } from 'mongoose';

// Common Types
export type ObjectId = Types.ObjectId;

// User Related Types
export interface UserProfile {
  firstName?: string;
  lastName?: string;
  grade?: number;
  preferredSubjects: string[];
}

export interface UserPreferences {
  emailNotifications: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
}

export interface UserPerformance {
  totalQuizzesTaken: number;
  averageScore: number;
  strongSubjects: string[];
  weakSubjects: string[];
}

// Quiz Related Types
export interface QuizMetadata {
  grade: number;
  subject: string;
  totalQuestions: number;
  timeLimit: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  tags: string[];
}

export interface QuizQuestion {
  questionId: string;
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'short_answer';
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  hints: string[];
  topic: string;
}

export interface AIGeneration {
  prompt: string;
  model: 'groq' | 'gemini';
  generatedAt: Date;
  adaptiveParams: {
    userPastPerformance: object;
    difficultyDistribution: object;
  };
}

// Submission Related Types
export interface SubmissionAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  timeSpent: number;
  hintsUsed: number;
}

export interface SubmissionScoring {
  totalQuestions: number;
  correctAnswers: number;
  totalPoints: number;
  scorePercentage: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface SubmissionTiming {
  startedAt: Date;
  submittedAt: Date;
  totalTimeSpent: number;
}

export interface AIEvaluation {
  model: 'groq' | 'gemini';
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
  evaluatedAt: Date;
}

export interface SubmissionMetadata {
  ipAddress: string;
  userAgent: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
}

// Notification Related Types
export interface NotificationContent {
  subject: string;
  body: string;
  attachments: string[];
}

export interface NotificationDelivery {
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  sentAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
  emailProvider: 'gmail' | 'sendgrid';
}

export interface NotificationRelatedData {
  submissionId?: ObjectId;
  quizId?: ObjectId;
  score?: number;
}

// Performance History Types
export interface PerformanceStats {
  totalQuizzes: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalTimeSpent: number;
  consistency: number;
}

export interface RecentPerformance {
  date: Date;
  score: number;
  quizId: ObjectId;
  difficulty: string;
}

export interface PerformanceTrends {
  improving: boolean;
  trendDirection: 'up' | 'down' | 'stable';
  recommendedDifficulty: 'easy' | 'medium' | 'hard';
}

export interface TopicWiseStats {
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  avgTimePerQuestion: number;
}

// Leaderboard Types
export interface LeaderboardCriteria {
  grade?: number;
  subject?: string;
  timeframe: 'all_time' | 'monthly' | 'weekly';
  month?: number;
  year?: number;
}

export interface LeaderboardRanking {
  rank: number;
  userId: ObjectId;
  username: string;
  score: number;
  totalQuizzes: number;
  lastAttemptDate: Date;
}

export interface LeaderboardMetadata {
  totalParticipants: number;
  lastUpdated: Date;
  cacheExpiry: Date;
}
