import { Router } from 'express';
import {
  submitQuiz,
  getSubmission,
  getUserSubmissions,
  getSubmissionDetails
} from '../controllers/submissionController.js';
import { authenticateToken } from '../middleware/auth.js';
import { submissionLimiter, generalLimiter } from '../middleware/rateLimiter.js';
import { submitQuizSchema, getSubmissionsSchema } from '../validators/submissionValidator.js';
import {validateRequest} from '../middleware/validation.js';

const router = Router();

// All submission routes require authentication
router.use(authenticateToken);

// Submit quiz with rate limiting
router.post('/submit', submissionLimiter, validateRequest(submitQuizSchema), submitQuiz);

// Get user's submissions with general rate limiting
router.get('/', generalLimiter, validateRequest(getSubmissionsSchema), getUserSubmissions);

// Get specific submission
router.get('/:submissionId', generalLimiter, getSubmission);

// Get detailed submission with explanations
router.get('/:submissionId/details', generalLimiter, getSubmissionDetails);

export default router;
