import type { Response } from 'express';
import {Notification, Submission, User} from '../models/index.js';
import { emailService } from '../services/index.js';
import { handleError, NotFoundError, BadRequestError } from '../utils/index.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest } from '../middleware/index.js';

export const sendQuizResultEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }

    const { submissionId } = req.body;
    const userId = req.user._id;

    // Find the submission
    const submission = await Submission.findOne({
      _id: submissionId,
      userId
    }).populate('quizId');

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    if (!req.user.email) {
      throw new BadRequestError('User email not found');
    }

    // Send email
    const emailSent = await emailService.sendQuizResultEmail(
        userId,
        req.user.email,
        {
          username: req.user.username,
          quizTitle: (submission.quizId as any).title,
          score: submission.scoring.scorePercentage,
          totalQuestions: submission.scoring.totalQuestions,
          suggestions: submission.aiEvaluation.suggestions,
          grade: submission.scoring.grade
        }
    );

    if (!emailSent) {
      throw new Error('Failed to send email');
    }

    logger.info('Quiz result email sent:', {
      userId,
      submissionId,
      email: req.user.email
    });

    res.status(200).json({
      success: true,
      message: 'Quiz result email sent successfully',
      data: {
        submissionId,
        emailSent: true
      }
    });

  } catch (error) {
    handleError(res, 'sendQuizResultEmail', error as Error);
  }
};

export const getNotificationHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }

    const userId = req.user._id;
    const { page = 1, limit = 10, status, type } = req.query;

    const filter: any = { userId };

    if (status) filter['delivery.status'] = status;
    if (type) filter.type = type;

    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const skip = (pageNumber - 1) * pageSize;

    const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean();

    const total = await Notification.countDocuments(filter);
    const totalPages = Math.ceil(total / pageSize);

    logger.info('Notification history retrieved:', {
      userId,
      count: notifications.length,
      total
    });

    res.status(200).json({
      success: true,
      message: 'Notification history retrieved successfully',
      data: {
        notifications,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalItems: total,
          itemsPerPage: pageSize,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1
        }
      }
    });

  } catch (error) {
    handleError(res, 'getNotificationHistory', error as Error);
  }
};

export const updateNotificationPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }

    const { emailNotifications } = req.body;
    const userId = req.user._id;

    // Update user preferences
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            'preferences.emailNotifications': emailNotifications
          }
        },
        { new: true, runValidators: true }
    ).select('-password').lean();

    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }

    logger.info('Notification preferences updated:', {
      userId,
      emailNotifications
    });

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: {
        emailNotifications: updatedUser.preferences.emailNotifications
      }
    });

  } catch (error) {
    handleError(res, 'updateNotificationPreferences', error as Error);
  }
};
