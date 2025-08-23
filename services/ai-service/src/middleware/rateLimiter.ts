import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { logger } from '../utils/logger.js';

// AI service limiter (more restrictive due to expensive AI operations)
export const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 10, // limit each IP to 10 AI requests per 5 minutes
  message: {
    success: false,
    error: {
      message: 'Too many AI requests, please wait before generating more content.',
      code: 'AI_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('AI rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many AI requests, please wait 5 minutes before trying again.',
        code: 'AI_RATE_LIMIT_EXCEEDED',
        retryAfter: 300 // 5 minutes in seconds
      }
    });
  }
});

// General limiter for non-AI endpoints
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
