import rateLimit from 'express-rate-limit';

export const quizLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many quiz requests, please try again later.',
      code: 'QUIZ_RATE_LIMIT_EXCEEDED'
    }
  }
});