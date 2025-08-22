import mongoose, { Document, Schema } from 'mongoose';
import type {
  LeaderboardCriteria,
  LeaderboardRanking,
  LeaderboardMetadata,
  ObjectId
} from '../types/index.js';

export interface ILeaderboard extends Document {
  _id: ObjectId;
  type: 'grade_subject' | 'overall' | 'monthly';
  criteria: LeaderboardCriteria;
  rankings: LeaderboardRanking[];
  metadata: LeaderboardMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const LeaderboardCriteriaSchema = new Schema<LeaderboardCriteria>({
  grade: { type: Number, min: 1, max: 12 },
  subject: { type: String, trim: true },
  timeframe: {
    type: String,
    enum: ['all_time', 'monthly', 'weekly'],
    required: true
  },
  month: { type: Number, min: 1, max: 12 },
  year: { type: Number, min: 2020, max: 2050 }
}, { _id: false });

const LeaderboardRankingSchema = new Schema<LeaderboardRanking>({
  rank: { type: Number, required: true, min: 1 },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: { type: String, required: true, trim: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  totalQuizzes: { type: Number, required: true, min: 1 },
  lastAttemptDate: { type: Date, required: true }
}, { _id: false });

const LeaderboardMetadataSchema = new Schema<LeaderboardMetadata>({
  totalParticipants: { type: Number, required: true, min: 0 },
  lastUpdated: { type: Date, required: true, default: Date.now },
  cacheExpiry: { type: Date, required: true }
}, { _id: false });

const LeaderboardSchema = new Schema<ILeaderboard>({
  type: {
    type: String,
    enum: ['grade_subject', 'overall', 'monthly'],
    required: true
  },
  criteria: { type: LeaderboardCriteriaSchema, required: true },
  rankings: {
    type: [LeaderboardRankingSchema],
    required: true,
    validate: {
      validator: function(rankings: LeaderboardRanking[]) {
        return rankings.length <= 100;
      },
      message: 'Leaderboard cannot exceed 100 rankings'
    }
  },
  metadata: { type: LeaderboardMetadataSchema, required: true }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
LeaderboardSchema.index({ type: 1, 'criteria.grade': 1, 'criteria.subject': 1 });
LeaderboardSchema.index({ 'metadata.cacheExpiry': 1 });
LeaderboardSchema.index({ 'criteria.timeframe': 1 });

export const Leaderboard = mongoose.model<ILeaderboard>('Leaderboard', LeaderboardSchema);
