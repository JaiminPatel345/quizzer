import mongoose, { Document, Schema } from 'mongoose';
import type { ObjectId, AITaskLog } from '../types/index.js';

export interface IAILog extends Omit<Document, 'model'> {
  _id: ObjectId;
  userId?: ObjectId;
  taskType: 'generation' | 'evaluation' | 'hint';
  inputData: any;
  outputData: any;
  model: 'groq' | 'gemini';
  processingTime: number;
  success: boolean;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AILogSchema = new Schema<IAILog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  taskType: {
    type: String,
    enum: ['generation', 'evaluation', 'hint'],
    required: true
  },
  inputData: {
    type: Schema.Types.Mixed,
    required: true
  },
  outputData: {
    type: Schema.Types.Mixed,
    required: false
  },
  model: {
    type: String,
    enum: ['groq', 'gemini'],
    required: true
  },
  processingTime: {
    type: Number,
    required: true,
    min: 0
  },
  success: {
    type: Boolean,
    required: true
  },
  error: {
    type: String,
    required: false
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
AILogSchema.index({ taskType: 1 });
AILogSchema.index({ model: 1 });
AILogSchema.index({ success: 1 });
AILogSchema.index({ createdAt: -1 });
AILogSchema.index({ userId: 1, createdAt: -1 });

export const AILog = mongoose.model<IAILog>('AILog', AILogSchema);
