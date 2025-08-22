import bcrypt from 'bcryptjs';
import type {Request, Response} from 'express';
import {User} from '../models/index.js';
import {generateToken} from '../middleware/auth.js';
import {
  handleError, BadRequestError, UnauthorizedError,
} from '../utils/errorHandler.js';
import {logger} from '../utils/logger.js';
import type {AuthRequest} from '../middleware/index.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const {username, password} = req.body;

    // Since this is mock authentication, we'll accept any username/password
    // But we still need to create/find a user for consistency
    let user = await User.findOne({username});

    if (!user) {
      // Create a new user with mock data
      const hashedPassword = await bcrypt.hash(password,
          parseInt(process.env.BCRYPT_ROUNDS || '12'),
      );

      user = new User({
        username, email: `${username}@mock.com`, // Mock email
        password: hashedPassword, profile: {
          preferredSubjects: [],
        }, preferences: {
          emailNotifications: true, difficulty: 'adaptive',
        }, performance: {
          totalQuizzesTaken: 0,
          averageScore: 0,
          strongSubjects: [],
          weakSubjects: [],
        },
      });

      await user.save();
      logger.info('New mock user created:', {username});
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    // Remove password from response
    const {password: _, ...userResponse} = user.toObject();

    logger.info('User logged in successfully:', {
      userId: user._id, username: user.username,
    });

    res.status(200).json({
      success: true, message: 'Login successful', data: {
        user: userResponse,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
    });

  } catch (error) {
    handleError(res, 'login', error as Error);
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {username, email, password, profile, preferences} = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{username}, {email}],
    });

    if (existingUser) {
      throw new BadRequestError('Username or email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password,
        parseInt(process.env.BCRYPT_ROUNDS || '12'),
    );

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      profile: profile || {preferredSubjects: []},
      preferences: preferences || {
        emailNotifications: true, difficulty: 'adaptive',
      },
      performance: {
        totalQuizzesTaken: 0,
        averageScore: 0,
        strongSubjects: [],
        weakSubjects: [],
      },
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    // Remove password from response
    const {password: _, ...userResponse} = user.toObject();

    logger.info('New user registered:', {
      userId: user._id, username: user.username, email: user.email,
    });

    res.status(201).json({
      success: true, message: 'Registration successful', data: {
        user: userResponse,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
    });

  } catch (error) {
    handleError(res, 'register', error as Error);
  }
};

export const validateToken = async (
    req: AuthRequest, res: Response): Promise<void> => {
  try {
    // User is already attached by auth middleware
    if (!req.user) {
      throw new UnauthorizedError('Invalid token');
    }

    res.status(200).json({
      success: true, message: 'Token is valid', data: {
        user: req.user, isValid: true,
      },
    });

  } catch (error) {
    handleError(res, 'validateToken', error as Error);
  }
};

export const getProfile = async (
    req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const user = await User.findById(req.user._id).select('-password').lean();

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    res.status(200).json({
      success: true, message: 'Profile retrieved successfully', data: {user},
    });

  } catch (error) {
    handleError(res, 'getProfile', error as Error);
  }
};

export const updateProfile = async (
    req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const {profile, preferences} = req.body;
    const updateData: any = {};

    if (profile) {
      updateData.profile = {...req.user.profile, ...profile};
    }

    if (preferences) {
      updateData.preferences = {...req.user.preferences, ...preferences};
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id,
        {$set: updateData},
        {new: true, runValidators: true},
    ).select('-password').lean();

    if (!updatedUser) {
      throw new UnauthorizedError('User not found');
    }

    logger.info('User profile updated:', {
      userId: req.user._id, updates: Object.keys(updateData),
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {user: updatedUser},
    });

  } catch (error) {
    handleError(res, 'updateProfile', error as Error);
  }
};
