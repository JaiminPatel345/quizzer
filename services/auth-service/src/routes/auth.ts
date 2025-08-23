import { Router } from 'express';
import { login, register, validateToken } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Auth rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    }
  }
});

// Public routes with rate limiting
router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);

// Protected routes
router.post('/validate', authenticateToken, validateToken);

export default router;
