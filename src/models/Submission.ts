import mongoose, { Document, Schema } from 'mongoose';
import type {
  SubmissionAnswer,
  SubmissionScoring,
  SubmissionTiming,
  AIEvaluation,
  SubmissionMetadata,
  ObjectId
} from '../types/index.js';

export interface ISubmission extends Document {
  _id: ObjectId;
  quizId: ObjectId;
  userId: ObjectId;
  attemptNumber: number;
  answers: SubmissionAnswer[];
  scoring: SubmissionScoring;
  timing: SubmissionTiming;
  aiEvaluation: AIEvaluation;
  metadata: SubmissionMetadata;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionAnswerSchema = new Schema<SubmissionAnswer>({
  questionId: { type: String, required: true },
  userAnswer: { type: String, required: true, trim: true },
  isCorrect: { type: Boolean, required: true },
  pointsEarned: { type: Number, required: true, min: 0 },
  timeSpent: { type: Number, required: true, min: 0 }, // seconds
  hintsUsed: { type: Number, default: 0, min: 0 }
}, { _id: false });

const SubmissionScoringSchema = new Schema<SubmissionScoring>({
  totalQuestions: { type: Number, required: true, min: 1 },
  correctAnswers: { type: Number, required: true, min: 0 },
  totalPoints: { type: Number, required: true, min: 0 },
  scorePercentage: { type: Number, required: true, min: 0, max: 100 },
  grade: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'F'],
    required: true
  }
}, { _id: false });

const SubmissionTimingSchema = new Schema<SubmissionTiming>({
  startedAt: { type: Date, required: true },
  submittedAt: { type: Date, required: true },
  totalTimeSpent: { type: Number, required: true, min: 0 } // seconds
}, { _id: false });

const AIEvaluationSchema = new Schema<AIEvaluation>({
  model: { type: String, enum: ['groq', 'gemini'], required: true },
  suggestions: [{ type: String, trim: true }],
  strengths: [{ type: String, trim: true }],
  weaknesses: [{ type: String, trim: true }],
  evaluatedAt: { type: Date, required: true, default: Date.now }
}, { _id: false });

const SubmissionMetadataSchema = new Schema<SubmissionMetadata>({
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true },
  deviceType: {
    type: String,
    enum: ['mobile', 'desktop', 'tablet'],
    required: true
  }
}, { _id: false });

const SubmissionSchema = new Schema<ISubmission>({
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attemptNumber: { type: Number, required: true, min: 1 },
  answers: {
    type: [SubmissionAnswerSchema],
    required: true,
    validate: {
      validator: function(answers: SubmissionAnswer[]) {
        return answers.length > 0;
      },
      message: 'Submission must have at least one answer'
    }
  },
  scoring: { type: SubmissionScoringSchema, required: true },
  timing: { type: SubmissionTimingSchema, required: true },
  aiEvaluation: { type: AIEvaluationSchema, required: true },
  metadata: { type: SubmissionMetadataSchema, required: true },
  isCompleted: { type: Boolean, default: false }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
SubmissionSchema.index({ userId: 1, quizId: 1, attemptNumber: 1 }, { unique: true });
SubmissionSchema.index({ userId: 1, 'timing.submittedAt': -1 });
SubmissionSchema.index({ quizId: 1 });
SubmissionSchema.index({ 'scoring.scorePercentage': -1 });

export const Submission = mongoose.model<ISubmission>('Submission', SubmissionSchema);
