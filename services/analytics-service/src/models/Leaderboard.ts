import mongoose, {Document, Schema} from 'mongoose';
import type {
  LeaderboardCriteria, LeaderboardRanking, LeaderboardMetadata, ObjectId,
} from '../types/index.js';

export interface ILeaderboard extends Document {
  _id: ObjectId;
  type: string;
  criteria: LeaderboardCriteria;
  rankings: LeaderboardRanking[];
  metadata: LeaderboardMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const LeaderboardCriteriaSchema = new Schema<LeaderboardCriteria>({
  grade: {type: Number, min: 1, max: 12, required: false},
  subject: {type: String, trim: true, required: false},
  timeframe: {
    type: String, enum: ['all_time', 'monthly', 'weekly'], required: true,
  },
  month: {type: Number, min: 1, max: 12, required: false},
  year: {type: Number, min: 2020, max: 2050, required: false},
}, {_id: false});

const LeaderboardRankingSchema = new Schema<LeaderboardRanking>({
  rank: {type: Number, required: true, min: 1},
  userId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  username: {type: String, required: true, trim: true},
  score: {type: Number, required: true, min: 0, max: 100},
  totalQuizzes: {type: Number, required: true, min: 0},
  lastAttemptDate: {type: Date, required: true},
}, {_id: false});

const LeaderboardMetadataSchema = new Schema<LeaderboardMetadata>({
  totalParticipants: {type: Number, required: true, min: 0},
  lastUpdated: {type: Date, required: true, default: Date.now},
  cacheExpiry: {type: Date, required: true},
}, {_id: false});

const LeaderboardSchema = new Schema<ILeaderboard>({
  type: {type: String, required: true, trim: true},
  criteria: {type: LeaderboardCriteriaSchema, required: true},
  rankings: {
    type: [LeaderboardRankingSchema], required: true, validate: {
      validator: function(rankings: LeaderboardRanking[]) {
        return rankings.length <= 100; // Limit to top 100
      }, message: 'Leaderboard cannot have more than 100 rankings',
    },
  },
  metadata: {type: LeaderboardMetadataSchema, required: true},
}, {
  timestamps: true, versionKey: false,
});

// Indexes
LeaderboardSchema.index({type: 1, 'criteria.grade': 1, 'criteria.subject': 1});
LeaderboardSchema.index({'metadata.cacheExpiry': 1});
LeaderboardSchema.index({'metadata.lastUpdated': -1});

export const Leaderboard = mongoose.model<ILeaderboard>('Leaderboard',
    LeaderboardSchema,
);
