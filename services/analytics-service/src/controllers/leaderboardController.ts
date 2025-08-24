import type { Response } from 'express';
import { Types } from 'mongoose';
import { Leaderboard } from '../models/Leaderboard.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { LeaderboardService } from '../services/leaderboardService.js';
import { handleError, BadRequestError, UnauthorizedError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest, LeaderboardCriteria } from '../types/index.js';

export const getLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      type = 'overall', 
      grade, 
      subject, 
      timeframe = 'all_time', 
      limit = '50',
      includeUser = 'false',
      sortBy = 'score'
    } = req.query;

    const limitNumber = Math.min(parseInt(limit as string) || 50, 100); // Max 100 entries
    const userId = req.user?._id ? new Types.ObjectId(req.user._id) : undefined;

    // Validate parameters
    if (grade && (parseInt(grade as string) < 1 || parseInt(grade as string) > 12)) {
      throw new BadRequestError('Grade must be between 1 and 12');
    }

    if (!['overall', 'grade', 'subject', 'grade_subject'].includes(type as string)) {
      throw new BadRequestError('Invalid leaderboard type');
    }

    if (!['all_time', 'monthly', 'weekly', 'daily'].includes(timeframe as string)) {
      throw new BadRequestError('Invalid timeframe');
    }

    // Build criteria
    const criteria: LeaderboardCriteria = {
      type: type as string,
      timeframe: timeframe as any,
      sortBy: sortBy as string
    };

    if (grade) criteria.grade = parseInt(grade as string);
    if (subject) criteria.subject = subject as string;

    // Generate leaderboard using enhanced service
    const leaderboard = await LeaderboardService.generateEnhancedLeaderboard(
      criteria, 
      limitNumber,
      includeUser === 'true' ? userId : undefined
    );

    logger.info('Enhanced leaderboard generated:', {
      type,
      grade,
      subject,
      timeframe,
      participants: leaderboard.metadata.totalParticipants,
      cached: leaderboard.metadata.isCached
    });

    res.status(200).json({
      success: true,
      message: 'Leaderboard retrieved successfully',
      data: leaderboard
    });

  } catch (error) {
    handleError(res, 'getLeaderboard', error as Error);
  }
};

export const getUserRank = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }

    const userId = new Types.ObjectId(req.user._id);
    const { grade, subject, timeframe } = req.query;

    const criteria: LeaderboardCriteria = {
      timeframe: (timeframe as any) || 'all_time'
    };

    if (grade) criteria.grade = parseInt(grade as string);
    if (subject) criteria.subject = subject as string;

    // Generate leaderboard to get user rank
    const leaderboard = await AnalyticsService.generateLeaderboard(criteria, 1000);

    const userRanking = leaderboard.rankings.find((r: any) =>
        r.userId.toString() === userId.toString()
    );

    logger.info('User rank retrieved:', { userId, rank: userRanking?.rank });

    res.status(200).json({
      success: true,
      message: 'User rank retrieved successfully',
      data: {
        rank: userRanking?.rank || null,
        score: userRanking?.score || 0,
        totalQuizzes: userRanking?.totalQuizzes || 0,
        totalParticipants: leaderboard.metadata.totalParticipants,
        criteria
      }
    });

  } catch (error) {
    handleError(res, 'getUserRank', error as Error);
  }
};

export const getTopPerformers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, grade, limit = 10 } = req.query;

    const criteria: LeaderboardCriteria = {
      timeframe: 'all_time'
    };

    if (grade) criteria.grade = parseInt(grade as string);
    if (subject) criteria.subject = subject as string;

    const leaderboard = await AnalyticsService.generateLeaderboard(
        criteria,
        parseInt(limit as string)
    );

    const topPerformers = leaderboard.rankings.slice(0, parseInt(limit as string));

    logger.info('Top performers retrieved:', {
      count: topPerformers.length,
      subject,
      grade
    });

    res.status(200).json({
      success: true,
      message: 'Top performers retrieved successfully',
      data: {
        performers: topPerformers,
        criteria,
        totalParticipants: leaderboard.metadata.totalParticipants
      }
    });

  } catch (error) {
    handleError(res, 'getTopPerformers', error as Error);
  }
};
