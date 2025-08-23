import { Router } from 'express';
import { getLeaderboard, getUserRank, getTopPerformers } from '../controllers/leaderboardController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { leaderboardSchema } from '../validators/analyticsValidator.js';

const router = Router();

// Leaderboard can be viewed without authentication, but user-specific data requires auth
router.use(generalLimiter);

// Get leaderboard
router.get('/', validateRequest(leaderboardSchema), getLeaderboard);

// Get top performers (simplified leaderboard)
router.get('/top', getTopPerformers);

// Get user's rank (requires authentication)
router.get('/my-rank', authenticateToken, getUserRank);

export default router;
