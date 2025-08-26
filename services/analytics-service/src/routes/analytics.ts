import { Router } from 'express';
import {
  getUserPerformance,
  getSubjectPerformance,
  getPerformanceTrends,
  getTopicAnalysis,
  updateUserPerformance,
  cleanupDuplicateRecords
} from '../controllers/analyticsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import {
  getUserPerformanceSchema,
  getSubjectPerformanceSchema,
  updatePerformanceSchema
} from '../validators/analyticsValidator.js';

const router = Router();

// All analytics routes require authentication
router.use(authenticateToken);
router.use(generalLimiter);

// Get overall user performance
router.get('/performance', validateRequest(getUserPerformanceSchema), getUserPerformance);

// Get subject-specific performance
router.get('/performance/:subject/:grade', validateRequest(getSubjectPerformanceSchema), getSubjectPerformance);

// Get performance trends
router.get('/trends', getPerformanceTrends);

// Get topic-wise analysis
router.get('/topics', getTopicAnalysis);

// Update user performance (internal API)
router.post('/performance/update', validateRequest(updatePerformanceSchema), updateUserPerformance);

// Database cleanup endpoint (admin/internal use)
router.post('/cleanup', cleanupDuplicateRecords);

export default router;
