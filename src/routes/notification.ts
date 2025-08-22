import { Router } from 'express';
import { sendQuizResultEmail, getNotificationHistory, updateNotificationPreferences } from '../controllers/index.js';
import { authenticateToken, validateRequest } from '../middleware/index.js';
import { emailNotificationSchema } from '../validators/index.js';

const router = Router();

// All notification routes require authentication
router.use(authenticateToken);

// Send quiz result email
router.post('/send-result', validateRequest(emailNotificationSchema), sendQuizResultEmail);

// Notification history
router.get('/history', getNotificationHistory);

// Update notification preferences
router.put('/preferences', updateNotificationPreferences);

export default router;
