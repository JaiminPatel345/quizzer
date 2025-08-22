import mongoose, { Document, Schema } from 'mongoose';
import type {
  NotificationContent,
  NotificationDelivery,
  NotificationRelatedData,
  ObjectId
} from '../types/index.js';

export interface INotification extends Document {
  _id: ObjectId;
  userId: ObjectId;
  type: 'quiz_result' | 'weekly_summary' | 'achievement';
  content: NotificationContent;
  delivery: NotificationDelivery;
  relatedData: NotificationRelatedData;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationContentSchema = new Schema<NotificationContent>({
  subject: { type: String, required: true, trim: true, maxlength: 200 },
  body: { type: String, required: true, trim: true, maxlength: 5000 },
  attachments: [{ type: String, trim: true }]
}, { _id: false });

const NotificationDeliverySchema = new Schema<NotificationDelivery>({
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'bounced'],
    default: 'pending'
  },
  sentAt: { type: Date },
  deliveredAt: { type: Date },
  errorMessage: { type: String, trim: true },
  emailProvider: {
    type: String,
    enum: ['gmail', 'sendgrid'],
    required: true
  }
}, { _id: false });

const NotificationRelatedDataSchema = new Schema<NotificationRelatedData>({
  submissionId: { type: Schema.Types.ObjectId, ref: 'Submission' },
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz' },
  score: { type: Number, min: 0, max: 100 }
}, { _id: false });

const NotificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['quiz_result', 'weekly_summary', 'achievement'],
    required: true
  },
  content: { type: NotificationContentSchema, required: true },
  delivery: { type: NotificationDeliverySchema, required: true },
  relatedData: { type: NotificationRelatedDataSchema, default: {} }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ 'delivery.status': 1 });
NotificationSchema.index({ type: 1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
