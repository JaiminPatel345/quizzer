import type { Response } from 'express';
import { PerformanceHistory } from '../models/PerformanceHistory.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { handleError, NotFoundError, UnauthorizedError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest } from '../types/index.js';
import mongoose from 'mongoose';

export const getUserPerformance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { subject, grade } = req.query;
    const userId = req.user._id;

    // Build filter
    const filter: any = { userId };
    if (subject) filter.subject = new RegExp(subject as string, 'i');
    if (grade) filter.grade = parseInt(grade as string);

    const performances = await PerformanceHistory.find(filter)
    .sort({ lastCalculatedAt: -1 })
    .lean();

    if (performances.length === 0) {
      throw new NotFoundError('Performance history not found');
    }

    logger.info('User performance retrieved:', {
      userId,
      performancesCount: performances.length
    });

    res.status(200).json({
      success: true,
      message: 'Performance history retrieved successfully',
      data: {
        performances,
        summary: {
          totalSubjects: performances.length,
          overallAverage: performances.reduce((sum, p) => sum + p.stats.averageScore, 0) / performances.length,
          totalQuizzes: performances.reduce((sum, p) => sum + p.stats.totalQuizzes, 0)
        }
      }
    });

  } catch (error) {
    handleError(res, 'getUserPerformance', error as Error);
  }
};

export const getSubjectPerformance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { subject, grade } = req.params;
    const userId = req.user._id;

    const performance = await PerformanceHistory.findOne({
      userId,
      subject,
      grade: parseInt(grade as string)
    }).lean();

    if (!performance) {
      throw new NotFoundError('Subject performance not found');
    }

    logger.info('Subject performance retrieved:', {
      userId,
      subject,
      grade
    });

    res.status(200).json({
      success: true,
      message: 'Subject performance retrieved successfully',
      data: { performance }
    });

  } catch (error) {
    handleError(res, 'getSubjectPerformance', error as Error);
  }
};

export const getPerformanceTrends = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { timeframe = 'monthly' } = req.query;
    const userId = req.user._id;

    const performances = await PerformanceHistory.find({ userId })
    .select('subject grade stats.averageScore trends lastCalculatedAt')
    .sort({ lastCalculatedAt: -1 })
    .lean();

    // Calculate trends over time
    const trendData = performances.map(p => ({
      subject: p.subject,
      grade: p.grade,
      averageScore: p.stats.averageScore,
      trend: p.trends,
      lastUpdated: p.lastCalculatedAt
    }));

    logger.info('Performance trends retrieved:', {
      userId,
      trendsCount: trendData.length
    });

    res.status(200).json({
      success: true,
      message: 'Performance trends retrieved successfully',
      data: {
        trends: trendData,
        insights: {
          improving: trendData.filter(t => t.trend.improving).length,
          declining: trendData.filter(t => !t.trend.improving).length,
          stable: trendData.filter(t => t.trend.trendDirection === 'stable').length
        }
      }
    });

  } catch (error) {
    handleError(res, 'getPerformanceTrends', error as Error);
  }
};

export const getTopicAnalysis = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { subject, grade } = req.query;
    const userId = req.user._id;

    const filter: any = { userId };
    if (subject) filter.subject = new RegExp(subject as string, 'i');
    if (grade) filter.grade = parseInt(grade as string);

    const performances = await PerformanceHistory.find(filter)
    .select('subject grade topicWiseStats')
    .lean();

    // Aggregate topic stats across all subjects/grades
    const topicMap = new Map();

    performances.forEach(p => {
      p.topicWiseStats.forEach(topic => {
        const key = `${topic.topic}_${p.subject}_${p.grade}`;
        if (!topicMap.has(key)) {
          topicMap.set(key, {
            // topic: topic.topic,
            subject: p.subject,
            grade: p.grade,
            ...topic
          });
        }
      });
    });

    const topicAnalysis = Array.from(topicMap.values())
    .sort((a, b) => b.accuracy - a.accuracy);

    logger.info('Topic analysis retrieved:', {
      userId,
      topicsCount: topicAnalysis.length
    });

    res.status(200).json({
      success: true,
      message: 'Topic analysis retrieved successfully',
      data: {
        topics: topicAnalysis,
        insights: {
          strongestTopic: topicAnalysis[0] || null,
          weakestTopic: topicAnalysis[topicAnalysis.length - 1] || null,
          averageAccuracy: topicAnalysis.reduce((sum, t) => sum + t.accuracy, 0) / topicAnalysis.length || 0
        }
      }
    });

  } catch (error) {
    handleError(res, 'getTopicAnalysis', error as Error);
  }
};

export const updateUserPerformance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { subject, grade, submissionData } = req.body;
    const userId = req.user._id;

    await AnalyticsService.updateUserPerformance(new mongoose.Types.ObjectId(userId), subject, grade, submissionData);

    logger.info('User performance updated via API:', {
      userId,
      subject,
      grade
    });

    res.status(200).json({
      success: true,
      message: 'User performance updated successfully'
    });

  } catch (error) {
    handleError(res, 'updateUserPerformance', error as Error);
  }
};
