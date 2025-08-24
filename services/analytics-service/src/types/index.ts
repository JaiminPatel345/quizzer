import type { Types } from 'mongoose';
import type { Request } from 'express';

export type ObjectId = Types.ObjectId;

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    username: string;
    email: string;
  };
  userId?: ObjectId;
}

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

export interface LeaderboardCriteria {
  type?: string;
  grade?: number;
  subject?: string;
  timeframe: 'all_time' | 'monthly' | 'weekly' | 'daily';
  month?: number;
  year?: number;
  sortBy?: string;
}

export interface LeaderboardRanking {
  rank: number;
  userId: ObjectId;
  username: string;
  score: number;
  totalQuizzes: number;
  lastAttemptDate: Date;
  averageScore: number;
  bestScore: number;
  grade?: number;
  subject?: string;
  consistency?: number;
  badge?: string;
  isCurrentUser?: boolean;
}

export interface LeaderboardMetadata {
  totalParticipants: number;
  lastUpdated: Date;
  cacheExpiry: Date;
  isCached?: boolean;
  generationTime?: number;
  criteria: LeaderboardCriteria;
}

export interface EnhancedLeaderboard {
  type: string;
  criteria: LeaderboardCriteria;
  rankings: LeaderboardRanking[];
  metadata: LeaderboardMetadata;
  userContext?: {
    userRank: number;
    userScore: number;
    rankingTrend: 'up' | 'down' | 'stable' | 'new';
    nearbyRankings: LeaderboardRanking[];
  };
  statistics: {
    averageScore: number;
    medianScore: number;
    topScore: number;
    participationRate: number;
    gradeDistribution?: Record<string, number>;
    subjectDistribution?: Record<string, number>;
  };
}
