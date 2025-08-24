import {Router} from 'express';
import {
  createAIGeneratedQuiz,
  createQuiz,
  deleteQuiz,
  duplicateQuiz,
  generateHintForQuestion,
  getQuizById,
  getQuizzes,
  submitQuiz,
  updateQuestionHints,
  updateQuiz,
  getQuizHistory,
  getSubmissionSuggestions,
  getPersonalizedSuggestions,
} from '../controllers/quizController.js';
import {authenticateToken} from '../middleware/auth.js';
import {quizLimiter} from '../middleware/rateLimiter.js';
import {validateRequest} from '../middleware/validation.js';
import {
  createAIQuizSchema,
  createQuizSchema,
  deleteQuizSchema,
  duplicateQuizSchema,
  getQuizByIdSchema,
  getQuizzesSchema,
  updateQuizSchema,
} from '../validators/quizValidator.js';
import {
  generateHintForQuestionSchema, updateQuestionHintsSchema,
} from '../validators/hintValidator.js';
import {
  submitQuizSchema,
} from '../validators/submissionValidator.js';
import {
  getQuizHistorySchema,
} from '../validators/historyValidator.js';

const router = Router();

// Public routes (with optional auth for personalized results)
router.get('/', quizLimiter, validateRequest(getQuizzesSchema), getQuizzes);

router.get('/:quizId',
    quizLimiter,
    validateRequest(getQuizByIdSchema),
    getQuizById,
);

// Protected routes : internal route
router.post('/',
    authenticateToken,
    quizLimiter,
    validateRequest(createQuizSchema),
    createQuiz,
);

router.put('/:quizId',
    authenticateToken,
    quizLimiter,
    validateRequest(updateQuizSchema),
    updateQuiz,
);

router.delete('/:quizId',
    authenticateToken,
    quizLimiter,
    validateRequest(deleteQuizSchema),
    deleteQuiz,
);

router.post('/:quizId/duplicate',
    authenticateToken,
    quizLimiter,
    validateRequest(duplicateQuizSchema),
    duplicateQuiz,
);

router.post('/:quizId/question/:questionId/hint',
    authenticateToken,
    quizLimiter,
    validateRequest(generateHintForQuestionSchema),
    generateHintForQuestion,
);

// Hint management : internal route
router.put('/:quizId/question/:questionId/hints',
    authenticateToken,
    quizLimiter,
    validateRequest(updateQuestionHintsSchema),
    updateQuestionHints,
);

// Update route to use new parameter name
router.get('/:quizId',
    quizLimiter,
    validateRequest(getQuizByIdSchema),
    getQuizById,
);

// generate quiz using ai : Client route
router.post('/generate',
    authenticateToken,
    quizLimiter,
    validateRequest(createAIQuizSchema),
    createAIGeneratedQuiz,
);

router.post('/:quizId/submit',
    authenticateToken,
    quizLimiter,
    validateRequest(submitQuizSchema),
    submitQuiz,
);

// Get quiz history with filters
router.get('/history',
    authenticateToken,
    quizLimiter,
    validateRequest(getQuizHistorySchema),
    getQuizHistory,
);

// Get improvement suggestions for a specific submission
router.get('/submission/:submissionId/suggestions',
    authenticateToken,
    quizLimiter,
    getSubmissionSuggestions,
);

// Get personalized improvement suggestions based on recent performance
router.get('/suggestions',
    authenticateToken,
    quizLimiter,
    getPersonalizedSuggestions,
);

export default router;
