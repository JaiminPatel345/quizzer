import type { Response } from 'express';
import { Leaderboard } from '../models/Leaderboard.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { handleError, BadRequestError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest, LeaderboardCriteria } from '../types/index.js';

export const getLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, grade, subject, timeframe, month, year, limit } = req.query;

    const leaderboardType = type as string || 'overall';
    const limitNumber = parseInt(limit as string) || 50;

    // Build criteria
    const criteria: LeaderboardCriteria = {
      timeframe: (timeframe as any) || 'all_time'
    };

    if (grade) criteria.grade = parseInt(grade as string);
    if (subject) criteria.subject = subject as string;
    if (month) criteria.month = parseInt(month as string);
    if (year) criteria.year = parseInt(year as string);

    // Check cache first
    const cachedLeaderboard = await Leaderboard.findOne({
      type: leaderboardType,
      criteria,
      'metadata.cacheExpiry': { $gt: new Date() }
    }).lean();

    if (cachedLeaderboard) {
      logger.info('Leaderboard served from cache:', { type: leaderboardType });
      res.status(200).json({
        success: true,
        message: 'Leaderboard retrieved successfully (cached)',
        data: cachedLeaderboard
      });
      return;
    }

    // Generate new leaderboard
    const leaderboard = await AnalyticsService.generateLeaderboard(criteria, limitNumber);

    logger.info('Leaderboard generated:', {
      type: leaderboardType,
      participants: leaderboard.metadata.totalParticipants,
      grade,
      subject
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

    const userId = req.user._id;
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
