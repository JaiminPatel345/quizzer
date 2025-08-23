import { Router } from 'express';
import { evaluateSubmission, getSuggestions } from '../controllers/evaluationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { evaluateSubmissionSchema, getSuggestionsSchema } from '../validators/evaluationValidator.js';

const router = Router();

// All evaluation routes require authentication and AI rate limiting
router.use(authenticateToken);
router.use(aiLimiter);

// Evaluate quiz submission
router.post('/submission', validateRequest(evaluateSubmissionSchema), evaluateSubmission);

// Get improvement suggestions based on performance
router.post('/suggestions', validateRequest(getSuggestionsSchema), getSuggestions);

export default router;
