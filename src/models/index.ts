// Export all models
export { User } from './User.js';
export { Quiz } from './Quiz.js';
export { Submission } from './Submission.js';
export { Notification } from './Notification.js';
export { PerformanceHistory } from './PerformanceHistory.js';
export { Leaderboard } from './Leaderboard.js';

// Export all interfaces (type-only exports)
export type { IUser } from './User.js';
export type { IQuiz } from './Quiz.js';
export type { ISubmission } from './Submission.js';
export type { INotification } from './Notification.js';
export type { IPerformanceHistory } from './PerformanceHistory.js';
export type { ILeaderboard } from './Leaderboard.js';

// Re-export all types
export type * from '../types/index.js';
