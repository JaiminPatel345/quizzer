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
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  tags: string[];
  category?: string;
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
