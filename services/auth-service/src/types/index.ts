import { Request } from 'express';
import type { Types } from 'mongoose';

export type ObjectId = Types.ObjectId;

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

export interface AuthRequest extends Request {
  user?: IUser;
  userId?: ObjectId;
}

export interface IUser {
  _id: ObjectId;
  username: string;
  email: string;
  password: string;
  profile: UserProfile;
  preferences: UserPreferences;
  performance: UserPerformance;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}
