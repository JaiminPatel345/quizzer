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
  grade?: number;
  subject?: string;
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
