import rateLimit from 'express-rate-limit';
import type {Request, Response} from 'express';
import {logger} from '../utils/logger.js';

// General limiter for analytics endpoints
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false, error: {
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Analytics rate limit exceeded', {
      ip: req.ip, userAgent: req.get('User-Agent'), path: req.path,
    });

    res.status(429).json({
      success: false, error: {
        message: 'Too many analytics requests, please wait before trying again.',
        code: 'ANALYTICS_RATE_LIMIT_EXCEEDED',
        retryAfter: 900, // 15 minutes in seconds
      },
    });
  },
});

// Strict limiter for performance updates
export const updateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 20, // limit each IP to 20 updates per 5 minutes
  message: {
    success: false, error: {
      message: 'Too many performance updates, please slow down.',
      code: 'UPDATE_RATE_LIMIT_EXCEEDED',
    },
  }, standardHeaders: true, legacyHeaders: false,
});
