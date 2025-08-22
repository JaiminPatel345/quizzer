import { Router } from 'express';
import { generateQuiz, getQuizHistory, requestHint, retryQuiz } from '../controllers/index.js';
import { authenticateToken, validateRequest, aiLimiter, quizLimiter } from '../middleware/index.js';
import { generateQuizSchema, hintRequestSchema, quizHistorySchema, retryQuizSchema } from '../validators/index.js';

const router = Router();

// All quiz routes require authentication
router.use(authenticateToken);

// Quiz generation with AI rate limiting
router.post('/generate', aiLimiter, validateRequest(generateQuizSchema), generateQuiz);

// Quiz history with pagination
router.get('/history', validateRequest(quizHistorySchema), getQuizHistory);

// Hint generation with AI rate limiting
router.post('/hint', aiLimiter, validateRequest(hintRequestSchema), requestHint);

// Quiz retry
router.post('/retry/:quizId', quizLimiter, validateRequest(retryQuizSchema), retryQuiz);

export default router;
