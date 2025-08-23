import type {Response} from 'express';
import {User} from '../models/User.js';
import {
  handleError, NotFoundError, UnauthorizedError,
} from '../utils/errorHandler.js';
import {logger} from '../utils/logger.js';
import type {AuthRequest} from '../types/index.js';

export const getProfile = async (
    req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const userId = req.user._id;

    const user = await User.findById(userId).lean();

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const {password: _, ...userResponse} = user;

    logger.info('User profile retrieved:', {userId});

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {user: userResponse},
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

    const userId = req.user._id;
    const {profile, preferences} = req.body;

    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Update profile if provided
    if (profile) {
      if (profile.firstName !== undefined) {
        user.profile.firstName = profile.firstName;
      }
      if (profile.lastName !== undefined) {
        user.profile.lastName = profile.lastName;
      }
      if (profile.grade !== undefined) user.profile.grade = profile.grade;
      if (profile.preferredSubjects !== undefined) {
        user.profile.preferredSubjects = profile.preferredSubjects;
      }
    }

    // Update preferences if provided
    if (preferences) {
      if (preferences.emailNotifications !== undefined) {
        user.preferences.emailNotifications = preferences.emailNotifications;
      }
      if (preferences.difficulty !== undefined) {
        user.preferences.difficulty = preferences.difficulty;
      }
    }

    await user.save();

    const {password: _, ...userResponse} = user.toObject();

    logger.info('User profile updated:', {
      userId, profileUpdated: !!profile, preferencesUpdated: !!preferences,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {user: userResponse},
    });

  } catch (error) {
    handleError(res, 'updateProfile', error as Error);
  }
};

export const deleteAccount = async (
    req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const userId = req.user._id;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    logger.info('User account deleted:', {userId, username: user.username});

    res.status(200).json({
      success: true, message: 'Account deleted successfully', data: {userId},
    });

  } catch (error) {
    handleError(res, 'deleteAccount', error as Error);
  }
};
