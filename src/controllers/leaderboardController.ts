import type { Response } from 'express';
import { Leaderboard, Submission, User } from '../models/index.js';
import { cacheService } from '../services/cacheService.js';
import { handleError, BadRequestError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest } from '../middleware/index.js';

export const getLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, grade, subject, timeframe, month, year, limit } = req.query;

    const leaderboardType = type as string || 'overall';
    const limitNumber = parseInt(limit as string) || 50;

    // Generate cache key
    const cacheKey = cacheService.generateLeaderboardCacheKey(
        leaderboardType,
        grade ? parseInt(grade as string) : undefined,
        subject as string
    );

    // Check cache first
    const cachedLeaderboard = await cacheService.get(cacheKey);
    if (cachedLeaderboard) {
      logger.info('Leaderboard served from cache:', { type: leaderboardType, cacheKey });
      res.status(200).json({
        success: true,
        message: 'Leaderboard retrieved successfully (cached)',
        data: cachedLeaderboard
      });
      return;
    }

    // Build match criteria for aggregation
    const matchCriteria: any = { isCompleted: true };

    // Date filtering
    if (timeframe === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchCriteria['timing.submittedAt'] = { $gte: weekAgo };
    } else if (timeframe === 'monthly') {
      const monthNumber = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const yearNumber = year ? parseInt(year as string) : new Date().getFullYear();

      const startDate = new Date(yearNumber, monthNumber - 1, 1);
      const endDate = new Date(yearNumber, monthNumber, 0, 23, 59, 59);

      matchCriteria['timing.submittedAt'] = {
        $gte: startDate,
        $lte: endDate
      };
    }

    let pipeline: any[] = [];

    if (leaderboardType === 'grade_subject') {
      if (!grade || !subject) {
        throw new BadRequestError('Grade and subject are required for grade_subject leaderboard');
      }

      pipeline = [
        // Join with quizzes to filter by grade and subject
        {
          $lookup: {
            from: 'quizzes',
            localField: 'quizId',
            foreignField: '_id',
            as: 'quiz'
          }
        },
        { $unwind: '$quiz' },
        {
          $match: {
            ...matchCriteria,
            'quiz.metadata.grade': parseInt(grade as string),
            'quiz.metadata.subject': { $regex: new RegExp(subject as string, 'i') }
          }
        },
        // Group by user to get best score
        {
          $group: {
            _id: '$userId',
            bestScore: { $max: '$scoring.scorePercentage' },
            totalQuizzes: { $sum: 1 },
            lastAttemptDate: { $max: '$timing.submittedAt' },
            avgScore: { $avg: '$scoring.scorePercentage' }
          }
        },
        // Join with users to get username
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        // Sort by best score
        { $sort: { bestScore: -1, avgScore: -1 } },
        { $limit: limitNumber },
        // Add rank
        {
          $group: {
            _id: null,
            rankings: {
              $push: {
                userId: '$_id',
                username: '$user.username',
                score: '$bestScore',
                totalQuizzes: '$totalQuizzes',
                lastAttemptDate: '$lastAttemptDate'
              }
            }
          }
        },
        {
          $unwind: {
            path: '$rankings',
            includeArrayIndex: 'rank'
          }
        },
        {
          $addFields: {
            'rankings.rank': { $add: ['$rank', 1] }
          }
        },
        {
          $group: {
            _id: null,
            rankings: { $push: '$rankings' },
            totalParticipants: { $sum: 1 }
          }
        }
      ];
    } else {
      // Overall or monthly leaderboard
      pipeline = [
        { $match: matchCriteria },
        // Group by user to get best score
        {
          $group: {
            _id: '$userId',
            bestScore: { $max: '$scoring.scorePercentage' },
            totalQuizzes: { $sum: 1 },
            lastAttemptDate: { $max: '$timing.submittedAt' },
            avgScore: { $avg: '$scoring.scorePercentage' }
          }
        },
        // Join with users
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        // Sort by best score
        { $sort: { bestScore: -1, avgScore: -1 } },
        { $limit: limitNumber },
        // Add rank
        {
          $group: {
            _id: null,
            rankings: {
              $push: {
                userId: '$_id',
                username: '$user.username',
                score: '$bestScore',
                totalQuizzes: '$totalQuizzes',
                lastAttemptDate: '$lastAttemptDate'
              }
            }
          }
        },
        {
          $unwind: {
            path: '$rankings',
            includeArrayIndex: 'rank'
          }
        },
        {
          $addFields: {
            'rankings.rank': { $add: ['$rank', 1] }
          }
        },
        {
          $group: {
            _id: null,
            rankings: { $push: '$rankings' },
            totalParticipants: { $sum: 1 }
          }
        }
      ];
    }

    const result = await Submission.aggregate(pipeline);
    const leaderboardData = result[0] || { rankings: [], totalParticipants: 0 };

    // Create leaderboard document for caching
    const leaderboard = {
      type: leaderboardType,
      criteria: {
        grade: grade ? parseInt(grade as string) : undefined,
        subject: subject as string,
        timeframe: timeframe as string || 'all_time',
        month: month ? parseInt(month as string) : undefined,
        year: year ? parseInt(year as string) : undefined
      },
      rankings: leaderboardData.rankings,
      metadata: {
        totalParticipants: leaderboardData.totalParticipants,
        lastUpdated: new Date(),
        cacheExpiry: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      }
    };

    // Cache the leaderboard
    await cacheService.cacheLeaderboard(cacheKey, leaderboard);

    logger.info('Leaderboard generated:', {
      type: leaderboardType,
      participants: leaderboardData.totalParticipants,
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

    // Build match criteria
    const matchCriteria: any = { isCompleted: true };

    if (timeframe === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchCriteria['timing.submittedAt'] = { $gte: weekAgo };
    } else if (timeframe === 'monthly') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      matchCriteria['timing.submittedAt'] = { $gte: startOfMonth };
    }

    let pipeline: any[] = [];

    if (grade && subject) {
      pipeline = [
        {
          $lookup: {
            from: 'quizzes',
            localField: 'quizId',
            foreignField: '_id',
            as: 'quiz'
          }
        },
        { $unwind: '$quiz' },
        {
          $match: {
            ...matchCriteria,
            'quiz.metadata.grade': parseInt(grade as string),
            'quiz.metadata.subject': { $regex: new RegExp(subject as string, 'i') }
          }
        }
      ];
    } else {
      pipeline = [{ $match: matchCriteria }];
    }

    pipeline = pipeline.concat([
      {
        $group: {
          _id: '$userId',
          bestScore: { $max: '$scoring.scorePercentage' },
          totalQuizzes: { $sum: 1 }
        }
      },
      { $sort: { bestScore: -1 } },
      {
        $group: {
          _id: null,
          users: {
            $push: {
              userId: '$_id',
              bestScore: '$bestScore',
              totalQuizzes: '$totalQuizzes'
            }
          }
        }
      },
      {
        $unwind: {
          path: '$users',
          includeArrayIndex: 'rank'
        }
      },
      {
        $addFields: {
          'users.rank': { $add: ['$rank', 1] }
        }
      },
      {
        $match: {
          'users.userId': userId
        }
      }
    ]);

    const result = await Submission.aggregate(pipeline);
    const userRank = result[0]?.users || null;

    logger.info('User rank retrieved:', { userId, rank: userRank?.rank });

    res.status(200).json({
      success: true,
      message: 'User rank retrieved successfully',
      data: {
        rank: userRank?.rank || null,
        score: userRank?.bestScore || 0,
        totalQuizzes: userRank?.totalQuizzes || 0,
        criteria: { grade, subject, timeframe }
      }
    });

  } catch (error) {
    handleError(res, 'getUserRank', error as Error);
  }
};
