import { Router } from 'express';
import { generateQuestions, generateAdaptiveQuestions } from '../controllers/generationController.js';
import { generateHint } from '../controllers/hintController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { generateQuestionsSchema, generateHintSchema, adaptiveQuestionsSchema } from '../validators/generationValidator.js';

const router = Router();

// All generation routes require authentication and AI rate limiting
router.use(authenticateToken);
router.use(aiLimiter);

// Generate standard questions
router.post('/questions', validateRequest(generateQuestionsSchema), generateQuestions);

// Generate adaptive questions based on user performance
router.post('/adaptive', validateRequest(adaptiveQuestionsSchema), generateAdaptiveQuestions);

// Generate hint for a specific question
router.post('/hint', validateRequest(generateHintSchema), generateHint);

export default router;
