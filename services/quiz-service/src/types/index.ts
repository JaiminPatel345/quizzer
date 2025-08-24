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

export interface QuizMetadata {
  grade: number;
  subject: string;
  totalQuestions: number;
  timeLimit: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed' | 'adaptive';
  tags: string[];
  category?: string;
  adaptiveMetadata?: {
    originalDifficulty?: string;
    difficultyDistribution?: {
      easy: number;
      medium: number;
      hard: number;
    };
    confidenceLevel?: 'low' | 'medium' | 'high';
    adaptationFactors?: {
      performanceScore: number;
      consistencyScore: number;
      improvementTrend: number;
      subjectFamiliarity: number;
    };
    performanceBaseline?: {
      averageScore: number;
      totalQuizzes: number;
    };
  };
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

export interface QuizTemplate {
  name: string;
  description: string;
  defaultSettings: {
    timeLimit: number;
    questionsCount: number;
    difficulty: string;
  };
}

export interface Category {
  name: string;
  description: string;
  subjects: string[];
  grades: number[];
  isActive: boolean;
}

export interface AdaptiveFeatures {
  realTimeAdjustment: boolean;
  performanceTracking: boolean;
  difficultyProgression: boolean;
}

export interface RealTimeAdjustmentRequest {
  quizId: string;
  currentAnswers: Array<{
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    pointsEarned: number;
    timeSpent: number;
    hintsUsed: number;
  }>;
  remainingQuestions: number;
  currentDifficulty: 'easy' | 'medium' | 'hard';
  subject?: string;
  timeRemaining?: number;
}
