import mongoose, { Document, Schema } from 'mongoose';
import type { QuizMetadata, QuizQuestion, ObjectId } from '../types/index.js';

export interface IQuiz extends Document {
  _id: ObjectId;
  title: string;
  description?: string;
  metadata: QuizMetadata;
  questions: QuizQuestion[];
  template?: string;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isPublic: boolean;
  version: number;
}

const QuizMetadataSchema = new Schema<QuizMetadata>({
  grade: { type: Number, required: true, min: 1, max: 12 },
  subject: { type: String, required: true, trim: true },
  totalQuestions: { type: Number, required: true, min: 1, max: 50 },
  timeLimit: { type: Number, required: true, min: 5, max: 180 },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'mixed'],
    required: true
  },
  tags: [{ type: String, trim: true }],
  category: { type: String, trim: true }
}, { _id: false });

const QuizQuestionSchema = new Schema<QuizQuestion>({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true, trim: true },
  questionType: {
    type: String,
    enum: ['mcq', 'true_false', 'short_answer'],
    required: true
  },
  options: [{ type: String, trim: true }],
  correctAnswer: { type: String, required: true, trim: true },
  explanation: { type: String, trim: true },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  points: { type: Number, default: 1, min: 1, max: 10 },
  hints: [{ type: String, trim: true }],
  topic: { type: String, required: true, trim: true }
}, { _id: false });

const QuizSchema = new Schema<IQuiz>({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 1000 },
  metadata: { type: QuizMetadataSchema, required: true },
  questions: {
    type: [QuizQuestionSchema],
    required: true,
    validate: {
      validator: function(questions: QuizQuestion[]) {
        return questions.length > 0 && questions.length <= 50;
      },
      message: 'Quiz must have between 1 and 50 questions'
    }
  },
  template: { type: String, trim: true },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false },
  version: { type: Number, default: 1, min: 1 }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
QuizSchema.index({ 'metadata.grade': 1, 'metadata.subject': 1 });
QuizSchema.index({ createdBy: 1 });
QuizSchema.index({ isActive: 1, isPublic: 1 });
QuizSchema.index({ 'metadata.tags': 1 });
QuizSchema.index({ template: 1 });
QuizSchema.index({ createdAt: -1 });

export const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema);
