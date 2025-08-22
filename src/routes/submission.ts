import { Router } from 'express';
import { submitQuiz } from '../controllers/index.js';
import { authenticateToken, validateRequest, quizLimiter } from '../middleware/index.js';
import { submitQuizSchema } from '../validators/index.js';

const router = Router();

// All submission routes require authentication
router.use(authenticateToken);

// Submit quiz with rate limiting
router.post('/submit', quizLimiter, validateRequest(submitQuizSchema), submitQuiz);

export default router;
