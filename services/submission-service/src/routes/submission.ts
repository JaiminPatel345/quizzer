import { Router } from 'express';
import {
  submitQuiz,
  getSubmission,
  getUserSubmissions,
  getSubmissionDetails,
  getQuizAttempts,
  retryQuiz,
  compareAttempts,
  getBestAttempt
} from '../controllers/submissionController.js';
import { authenticateToken } from '../middleware/auth.js';
import { submissionLimiter, generalLimiter } from '../middleware/rateLimiter.js';
import { 
  submitQuizSchema, 
  getSubmissionsSchema, 
  getQuizAttemptsSchema,
  retryQuizSchema,
  compareAttemptsSchema,
  getBestAttemptSchema
} from '../validators/submissionValidator.js';
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

// Quiz retry and attempt management routes

// Get all attempts for a specific quiz
router.get('/quiz/:quizId/attempts', generalLimiter, validateRequest(getQuizAttemptsSchema), getQuizAttempts);

// Retry a quiz (submit new attempt)
router.post('/quiz/:quizId/retry', submissionLimiter, validateRequest(retryQuizSchema), retryQuiz);

// Get best attempt for a quiz
router.get('/quiz/:quizId/best', generalLimiter, validateRequest(getBestAttemptSchema), getBestAttempt);

// Compare two attempts for the same quiz
router.get('/quiz/:quizId/compare', generalLimiter, validateRequest(compareAttemptsSchema), compareAttempts);

export default router;
