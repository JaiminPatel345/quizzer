import {Router} from 'express';
import {
  deleteAccount, getProfile, updateProfile,
} from '../controllers/userController.js';
import {authenticateToken} from '../middleware/auth.js';
import {validateRequest} from '../middleware/validation.js';
import {generalLimiter} from '../middleware/rateLimiter.js';
import {updateProfileSchema} from '../validators/userValidator.js';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);
router.use(generalLimiter);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', validateRequest(updateProfileSchema), updateProfile);
router.delete('/account', deleteAccount);

export default router;
