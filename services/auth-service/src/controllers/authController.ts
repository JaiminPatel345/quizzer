import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { User } from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { handleError, BadRequestError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest } from '../types/index.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // Mock authentication - accept any username/password
    let user = await User.findOne({ username });

    if (!user) {
      // Create new user with mock data
      const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

      user = new User({
        username,
        email: `${username}@mock.com`,
        password: hashedPassword,
        profile: { preferredSubjects: [] },
        preferences: {
          emailNotifications: true,
          difficulty: 'adaptive'
        },
        performance: {
          totalQuizzesTaken: 0,
          averageScore: 0,
          strongSubjects: [],
          weakSubjects: []
        }
      });

      await user.save();
      logger.info('New mock user created:', { username });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user);

    const {password:_, ...userResponse} = user.toObject();

    logger.info('User logged in successfully:', {
      userId: user._id,
      username: user.username
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });

  } catch (error) {
    handleError(res, 'login', error as Error);
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, profile, preferences } = req.body;

    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      throw new BadRequestError('Username or email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    const user = new User({
      username,
      email,
      password: hashedPassword,
      profile: profile || { preferredSubjects: [] },
      preferences: preferences || {
        emailNotifications: true,
        difficulty: 'adaptive'
      },
      performance: {
        totalQuizzesTaken: 0,
        averageScore: 0,
        strongSubjects: [],
        weakSubjects: []
      }
    });

    await user.save();

    const token = generateToken(user);

    const {password:_, ...userResponse} = user.toObject();

    logger.info('New user registered:', {
      userId: user._id,
      username: user.username,
      email: user.email
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: userResponse,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });

  } catch (error) {
    handleError(res, 'register', error as Error);
  }
};

export const validateToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('Invalid token');
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user,
        isValid: true
      }
    });

  } catch (error) {
    handleError(res, 'validateToken', error as Error);
  }
};
