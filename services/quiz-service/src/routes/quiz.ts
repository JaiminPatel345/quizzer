import { Router } from 'express';
import {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  duplicateQuiz
} from '../controllers/quizController.js';
import { authenticateToken } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for quiz operations
const quizLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many quiz requests, please try again later.',
      code: 'QUIZ_RATE_LIMIT_EXCEEDED'
    }
  }
});

// Public routes (with optional auth for personalized results)
router.get('/', quizLimiter, getQuizzes);
router.get('/:quizId', quizLimiter, getQuizById);

// Protected routes
router.post('/', authenticateToken, quizLimiter, createQuiz);
router.put('/:quizId', authenticateToken, quizLimiter, updateQuiz);
router.delete('/:quizId', authenticateToken, quizLimiter, deleteQuiz);
router.post('/:quizId/duplicate', authenticateToken, quizLimiter, duplicateQuiz);

export default router;
