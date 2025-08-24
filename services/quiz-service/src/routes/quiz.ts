import { Router } from 'express';
import {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  duplicateQuiz,
  updateQuestionHints,
  createAIGeneratedQuiz, getQuizWithHints,
} from '../controllers/quizController.js';
import { authenticateToken } from '../middleware/auth.js';
import { quizLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validation.js';
import {
  createQuizSchema,
  getQuizzesSchema,
  getQuizByIdSchema,
  updateQuizSchema,
  deleteQuizSchema,
  duplicateQuizSchema, createAIQuizSchema,
} from '../validators/quizValidator.js';
import {updateQuestionHintsSchema} from '../validators/hintValidator.js';

const router = Router();

// Public routes (with optional auth for personalized results)
router.get('/', quizLimiter, validateRequest(getQuizzesSchema), getQuizzes);
router.get('/:quizId', quizLimiter, validateRequest(getQuizByIdSchema), getQuizById);

// Protected routes
router.post('/', authenticateToken, quizLimiter, validateRequest(createQuizSchema), createQuiz);
router.put('/:quizId', authenticateToken, quizLimiter, validateRequest(updateQuizSchema), updateQuiz);
router.delete('/:quizId', authenticateToken, quizLimiter, validateRequest(deleteQuizSchema), deleteQuiz);
router.post('/:quizId/duplicate', authenticateToken, quizLimiter, validateRequest(duplicateQuizSchema), duplicateQuiz);

// Hint management
router.put('/:quizId/question/:questionId/hints',
    authenticateToken,
    quizLimiter,
    validateRequest(updateQuestionHintsSchema),
    updateQuestionHints
);

// Update route to use new parameter name
router.get('/:quizId', quizLimiter, validateRequest(getQuizByIdSchema), getQuizById);

// Add new AI generation route
router.post('/generate', authenticateToken, quizLimiter, validateRequest(createAIQuizSchema), createAIGeneratedQuiz);


export default router;
