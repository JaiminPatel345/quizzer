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

export interface QuizGenerationParams {
  grade: number;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  totalQuestions: number;
  topics?: string[];
  adaptiveParams?: {
    userPastPerformance?: any;
    difficultyDistribution?: any;
  };
}

export interface SubmissionAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  timeSpent: number;
  hintsUsed: number;
}

export interface EvaluationResult {
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface AITaskLog {
  taskType: 'generation' | 'evaluation' | 'hint';
  inputData: any;
  outputData: any;
  model: 'groq' | 'gemini';
  processingTime: number;
  success: boolean;
  error?: string;
}
