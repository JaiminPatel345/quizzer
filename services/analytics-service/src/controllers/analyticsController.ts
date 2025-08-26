import type { Response } from 'express';
import { PerformanceHistory } from '../models/PerformanceHistory.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { handleError, NotFoundError, UnauthorizedError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { DatabaseCleanup } from '../utils/databaseCleanup.js';
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
    if (subject) {
      // Normalize subject name for consistent querying
      const normalizedSubject = (subject as string).trim().toLowerCase().replace(/\s+/g, ' ');
      filter.subject = new RegExp(`^${normalizedSubject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    }
    if (grade) filter.grade = parseInt(grade as string);

    const performances = await PerformanceHistory.find(filter)
    .sort({ lastCalculatedAt: -1 })
    .lean();

    if (performances.length === 0) {
      throw new NotFoundError('Performance history not found');
    }

    // Deduplicate performances by normalized subject and grade
    const deduplicatedPerformances: any[] = [];
    const seen = new Map<string, any>();

    for (const performance of performances) {
      const normalizedSubject = performance.subject.trim().toLowerCase().replace(/\s+/g, ' ');
      const key = `${normalizedSubject}_${performance.grade}`;
      
      if (!seen.has(key)) {
        seen.set(key, performance);
        deduplicatedPerformances.push(performance);
      } else {
        // If we find a duplicate, keep the one with the latest lastCalculatedAt
        const existing = seen.get(key);
        if (performance.lastCalculatedAt > existing.lastCalculatedAt) {
          const index = deduplicatedPerformances.indexOf(existing);
          deduplicatedPerformances[index] = performance;
          seen.set(key, performance);
        }
      }
    }

    // Sort by subject name for consistent ordering
    deduplicatedPerformances.sort((a, b) => {
      const subjectComparison = a.subject.localeCompare(b.subject);
      if (subjectComparison !== 0) return subjectComparison;
      return a.grade - b.grade;
    });

    logger.info('User performance retrieved:', {
      userId,
      performancesCount: deduplicatedPerformances.length,
      originalCount: performances.length,
      duplicatesRemoved: performances.length - deduplicatedPerformances.length
    });

    res.status(200).json({
      success: true,
      message: 'Performance history retrieved successfully',
      data: {
        performances: deduplicatedPerformances,
        summary: {
          totalSubjects: deduplicatedPerformances.length,
          overallAverage: deduplicatedPerformances.length > 0 
            ? deduplicatedPerformances.reduce((sum, p) => sum + p.stats.averageScore, 0) / deduplicatedPerformances.length 
            : 0,
          totalQuizzes: deduplicatedPerformances.reduce((sum, p) => sum + p.stats.totalQuizzes, 0)
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

    if (!subject) {
      throw new Error('Subject parameter is required');
    }

    // Normalize subject name for consistent querying
    const normalizedSubject = subject.trim().toLowerCase().replace(/\s+/g, ' ');

    const performance = await PerformanceHistory.findOne({
      userId,
      subject: new RegExp(`^${normalizedSubject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      grade: parseInt(grade as string)
    }).lean();

    if (!performance) {
      throw new NotFoundError('Subject performance not found');
    }

    logger.info('Subject performance retrieved:', {
      userId,
      subject: performance.subject,
      grade: performance.grade
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
    if (subject) {
      // Normalize subject name for consistent querying
      const normalizedSubject = (subject as string).trim().toLowerCase().replace(/\s+/g, ' ');
      filter.subject = new RegExp(`^${normalizedSubject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    }
    if (grade) filter.grade = parseInt(grade as string);

    const performances = await PerformanceHistory.find(filter)
    .select('subject grade topicWiseStats')
    .lean();

    // Aggregate topic stats across all subjects/grades, avoiding duplicates
    const topicMap = new Map();
    const processedSubjects = new Set();

    performances.forEach(p => {
      const normalizedSubject = p.subject.trim().toLowerCase().replace(/\s+/g, ' ');
      const subjectKey = `${normalizedSubject}_${p.grade}`;
      
      // Skip duplicates
      if (processedSubjects.has(subjectKey)) {
        return;
      }
      processedSubjects.add(subjectKey);

      p.topicWiseStats.forEach(topic => {
        const key = `${topic.topic}_${normalizedSubject}_${p.grade}`;
        if (!topicMap.has(key)) {
          topicMap.set(key, {
            topic: topic.topic,
            subject: p.subject, // Keep original case for display
            grade: p.grade,
            totalQuestions: topic.totalQuestions,
            correctAnswers: topic.correctAnswers,
            accuracy: topic.accuracy,
            avgTimePerQuestion: topic.avgTimePerQuestion
          });
        }
      });
    });

    const topicAnalysis = Array.from(topicMap.values())
    .sort((a, b) => b.accuracy - a.accuracy);

    logger.info('Topic analysis retrieved:', {
      userId,
      topicsCount: topicAnalysis.length,
      uniqueSubjects: processedSubjects.size
    });

    res.status(200).json({
      success: true,
      message: 'Topic analysis retrieved successfully',
      data: {
        topics: topicAnalysis,
        insights: {
          strongestTopic: topicAnalysis[0] || null,
          weakestTopic: topicAnalysis[topicAnalysis.length - 1] || null,
          averageAccuracy: topicAnalysis.length > 0 
            ? topicAnalysis.reduce((sum, t) => sum + t.accuracy, 0) / topicAnalysis.length 
            : 0
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

export const cleanupDuplicateRecords = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    // This endpoint could be restricted to admin users only
    logger.info('Starting database cleanup requested by user:', req.user._id);

    await DatabaseCleanup.mergeDuplicatePerformanceRecords();
    await DatabaseCleanup.cleanupInvalidRecords();

    logger.info('Database cleanup completed successfully');

    res.status(200).json({
      success: true,
      message: 'Database cleanup completed successfully'
    });

  } catch (error) {
    handleError(res, 'cleanupDuplicateRecords', error as Error);
  }
};
