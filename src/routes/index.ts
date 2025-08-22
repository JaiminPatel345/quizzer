import { Router } from 'express';
import authRoutes from './auth.js';
import quizRoutes from './quiz.js';
import submissionRoutes from './submission.js';
import leaderboardRoutes from './leaderboard.js';
import notificationRoutes from './notification.js';

const router = Router();

// Mount all routes
router.use('/auth', authRoutes);
router.use('/quiz', quizRoutes);
router.use('/submission', submissionRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/notification', notificationRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Quiz App API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;
