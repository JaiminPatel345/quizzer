import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import {type IUser, User} from '../models/index.js';
import { handleError, UnauthorizedError } from '../utils/errorHandler.js';
import type { ObjectId } from '../types/index.js';
import type {StringValue} from 'ms';

export interface AuthRequest extends Request {
  user?: IUser;
  userId?: ObjectId;
}

interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

export const authenticateToken = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable not configured');
    }

    // Verify token
    const payload = jwt.verify(token, jwtSecret) as JWTPayload;

    // Find user in database
    const user = await User.findById(payload.userId)
    .select('-password')
    .lean();

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Attach user to request
    req.user = user as IUser;
    req.userId = user._id;

    next();
  } catch (error) {
    handleError(res, 'authenticateToken', error as Error);
  }
};

export const optionalAuth = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!token) {
      return next(); // No token, continue without auth
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next(); // No JWT secret, continue without auth
    }

    try {
      const payload = jwt.verify(token, jwtSecret) as JWTPayload;
      const user = await User.findById(payload.userId)
      .select('-password')
      .lean();

      if (user) {
        req.user = user as IUser;
        req.userId = user._id;
      }
    } catch (jwtError) {
      // Invalid token, but continue without auth
    }

    next();
  } catch (error) {
    // Log error but don't block request
    console.error('Optional auth error:', error);
    next();
  }
};

export const generateToken = (user: IUser): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable not configured');
  }

  const payload = {
    userId: user._id.toString(),
    username: user.username,
    email: user.email
  };

  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn as StringValue});
};
