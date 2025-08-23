import mongoose, {Document, Schema} from 'mongoose';
import type {
  PerformanceStats,
  RecentPerformance,
  PerformanceTrends,
  TopicWiseStats,
  ObjectId,
} from '../types/index.js';

export interface IPerformanceHistory extends Document {
  _id: ObjectId;
  userId: ObjectId;
  subject: string;
  grade: number;
  stats: PerformanceStats;
  recentPerformance: RecentPerformance[];
  trends: PerformanceTrends;
  topicWiseStats: TopicWiseStats[];
  lastCalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PerformanceStatsSchema = new Schema<PerformanceStats>({
  totalQuizzes: {type: Number, required: true, min: 0},
  averageScore: {type: Number, required: true, min: 0, max: 100},
  bestScore: {type: Number, required: true, min: 0, max: 100},
  worstScore: {type: Number, required: true, min: 0, max: 100},
  totalTimeSpent: {type: Number, required: true, min: 0},
  consistency: {type: Number, required: true, min: 0, max: 100},
}, {_id: false});

const RecentPerformanceSchema = new Schema<RecentPerformance>({
  date: {type: Date, required: true},
  score: {type: Number, required: true, min: 0, max: 100},
  quizId: {type: Schema.Types.ObjectId, ref: 'Quiz', required: true},
  difficulty: {type: String, required: true},
}, {_id: false});

const PerformanceTrendsSchema = new Schema<PerformanceTrends>({
  improving: {type: Boolean, required: true}, trendDirection: {
    type: String, enum: ['up', 'down', 'stable'], required: true,
  }, recommendedDifficulty: {
    type: String, enum: ['easy', 'medium', 'hard'], required: true,
  },
}, {_id: false});

const TopicWiseStatsSchema = new Schema<TopicWiseStats>({
  topic: {type: String, required: true},
  totalQuestions: {type: Number, required: true, min: 0},
  correctAnswers: {type: Number, required: true, min: 0},
  accuracy: {type: Number, required: true, min: 0, max: 100},
  avgTimePerQuestion: {type: Number, required: true, min: 0},
}, {_id: false});

const PerformanceHistorySchema = new Schema<IPerformanceHistory>({
  userId: {
    type: Schema.Types.ObjectId, ref: 'User', required: true,
  },
  subject: {type: String, required: true, trim: true},
  grade: {type: Number, required: true, min: 1, max: 12},
  stats: {type: PerformanceStatsSchema, required: true},
  recentPerformance: {
    type: [RecentPerformanceSchema], default: [], validate: {
      validator: function(performances: RecentPerformance[]) {
        return performances.length <= 20; // Keep only last 20 performances
      }, message: 'Cannot store more than 20 recent performances',
    },
  },
  trends: {type: PerformanceTrendsSchema, required: true},
  topicWiseStats: {type: [TopicWiseStatsSchema], default: []},
  lastCalculatedAt: {type: Date, required: true, default: Date.now},
}, {
  timestamps: true, versionKey: false,
});

// Indexes
PerformanceHistorySchema.index({userId: 1, subject: 1, grade: 1},
    {unique: true},
);
PerformanceHistorySchema.index({userId: 1});
PerformanceHistorySchema.index({subject: 1, grade: 1});
PerformanceHistorySchema.index({lastCalculatedAt: -1});

export const PerformanceHistory = mongoose.model<IPerformanceHistory>(
    'PerformanceHistory',
    PerformanceHistorySchema,
);
