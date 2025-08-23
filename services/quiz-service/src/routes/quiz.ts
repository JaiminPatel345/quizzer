import { Router } from 'express';
import {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  duplicateQuiz, updateQuestionHints,
} from '../controllers/quizController.js';
import { authenticateToken } from '../middleware/auth.js';
import {quizLimiter} from '../middleware/rateLimiter.js';
import {updateQuestionHintsSchema} from '../validators/hintValidator.js';
import {validateRequest} from '../middleware/validation.js';

const router = Router();

// Public routes (with optional auth for personalized results)
router.get('/', quizLimiter, getQuizzes);
router.get('/:quizId', quizLimiter, getQuizById);

// Protected routes
router.post('/', authenticateToken, quizLimiter, createQuiz);
router.put('/:quizId', authenticateToken, quizLimiter, updateQuiz);
router.delete('/:quizId', authenticateToken, quizLimiter, deleteQuiz);
router.post('/:quizId/duplicate', authenticateToken, quizLimiter, duplicateQuiz);

// hint
router.put('/:quizId/question/:questionId/hints',
    authenticateToken,
    quizLimiter,
    validateRequest(updateQuestionHintsSchema),
    updateQuestionHints
);

export default router;
