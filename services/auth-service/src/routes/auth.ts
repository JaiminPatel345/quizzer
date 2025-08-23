import {Router} from 'express';
import {login, register, validateToken} from '../controllers/authController.js';
import {authenticateToken} from '../middleware/auth.js';
import {validateRequest} from '../middleware/validation.js';
import {authLimiter} from '../middleware/rateLimiter.js';
import {loginSchema, registerSchema} from '../validators/authValidator.js';

const router = Router();

// Public routes with rate limiting and validation
router.post('/login', authLimiter, validateRequest(loginSchema), login);
router.post('/register',
    authLimiter,
    validateRequest(registerSchema),
    register,
);

// Protected routes
router.post('/validate', authenticateToken, validateToken);

export default router;
