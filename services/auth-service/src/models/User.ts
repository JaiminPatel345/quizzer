import mongoose, { Document, Schema } from 'mongoose';
import type { UserProfile, UserPreferences, UserPerformance, ObjectId } from '../types/index.js';

export interface IUser extends Document {
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

const UserProfileSchema = new Schema<UserProfile>({
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  grade: { type: Number, min: 1, max: 12 },
  preferredSubjects: [{ type: String, trim: true }]
}, { _id: false });

const UserPreferencesSchema = new Schema<UserPreferences>({
  emailNotifications: { type: Boolean, default: true },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'adaptive'],
    default: 'adaptive'
  }
}, { _id: false });

const UserPerformanceSchema = new Schema<UserPerformance>({
  totalQuizzesTaken: { type: Number, default: 0, min: 0 },
  averageScore: { type: Number, default: 0, min: 0, max: 100 },
  strongSubjects: [{ type: String, trim: true }],
  weakSubjects: [{ type: String, trim: true }]
}, { _id: false });

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profile: {
    type: UserProfileSchema,
    default: () => ({ preferredSubjects: [] })
  },
  preferences: {
    type: UserPreferencesSchema,
    default: () => ({})
  },
  performance: {
    type: UserPerformanceSchema,
    default: () => ({ strongSubjects: [], weakSubjects: [] })
  },
  lastLoginAt: { type: Date }
}, {
  timestamps: true,
  versionKey: false
});

// // Indexes
// UserSchema.index({ username: 1 }, { unique: true });
// UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ 'profile.grade': 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
