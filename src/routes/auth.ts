import { Router } from 'express';
import { login, register, validateToken, getProfile, updateProfile } from '../controllers/index.js';
import { authenticateToken, validateRequest, authLimiter } from '../middleware/index.js';
import { loginSchema, registerSchema } from '../validators/index.js';

const router = Router();

// Public routes with rate limiting
router.post('/login', authLimiter, validateRequest(loginSchema), login);
router.post('/register', authLimiter, validateRequest(registerSchema), register);

// Protected routes
router.post('/validate', authenticateToken, validateToken);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

export default router;
