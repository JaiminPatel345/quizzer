import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { handleError, UnauthorizedError } from '../utils/errorHandler.js';
import type { IUser, ObjectId } from '../types/index.js';
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

    const payload = jwt.verify(token, jwtSecret) as JWTPayload;

    const user = await User.findById(payload.userId)
    .select('-password')
    .lean();

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    req.user = user as IUser;
    req.userId = user._id;

    next();
  } catch (error) {
    handleError(res, 'authenticateToken', error as Error);
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

  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn as StringValue });
};
