import { Router } from 'express';
import { getLeaderboard, getUserRank } from '../controllers/index.js';
import { optionalAuth, validateRequest } from '../middleware/index.js';
import { leaderboardSchema } from '../validators/index.js';

const router = Router();

// Leaderboard can be viewed without authentication, but user-specific data requires auth
router.get('/', optionalAuth, validateRequest(leaderboardSchema), getLeaderboard);
router.get('/my-rank', optionalAuth, getUserRank);

export default router;
