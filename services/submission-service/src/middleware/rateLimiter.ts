import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { logger } from '../utils/logger.js';

// Submission limiter (more restrictive)
export const submissionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 20, // limit each IP to 20 submissions per 10 minutes
  message: {
    success: false,
    error: {
      message: 'Too many submission requests, please slow down.',
      code: 'SUBMISSION_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Submission rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many submission requests, please wait 10 minutes before trying again.',
        code: 'SUBMISSION_RATE_LIMIT_EXCEEDED',
        retryAfter: 600 // 10 minutes in seconds
      }
    });
  }
});

// General limiter for other endpoints
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});
