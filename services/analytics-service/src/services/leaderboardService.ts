import { PerformanceHistory } from '../models/PerformanceHistory.js';
import { Leaderboard } from '../models/Leaderboard.js';
import { getSubmissionServiceClient } from '../config/serviceClient.js';
import { logger } from '../utils/logger.js';
import type { PipelineStage } from 'mongoose';
import type {
  LeaderboardCriteria,
  LeaderboardRanking,
  EnhancedLeaderboard,
  ObjectId,
} from '../types/index.js';

export class LeaderboardService {
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_RANKINGS = 100;
  private static readonly NEARBY_RANKINGS_COUNT = 5;

  /**
   * Generate an enhanced leaderboard with caching, statistics, and user context
   */
  static async generateEnhancedLeaderboard(
    criteria: LeaderboardCriteria,
    limit: number = 50,
    userId?: ObjectId
  ): Promise<EnhancedLeaderboard> {
    try {
      const startTime = Date.now();
      limit = Math.min(limit, this.MAX_RANKINGS);

      // Generate cache key
      const cacheKey = this.generateCacheKey(criteria);

      // Check cache first
      const cachedLeaderboard = await this.getCachedLeaderboard(cacheKey);
      if (cachedLeaderboard && !this.isCacheExpired(cachedLeaderboard)) {
        logger.info('Serving leaderboard from cache', { cacheKey, criteria });
        return this.enhanceWithUserContext(cachedLeaderboard, userId, limit);
      }

      // Generate fresh leaderboard
      const leaderboard = await this.generateFreshLeaderboard(criteria, limit);

      // Cache the result
      await this.cacheLeaderboard(cacheKey, leaderboard);

      // Add user context and statistics
      const enhancedLeaderboard = await this.enhanceLeaderboard(leaderboard, userId, criteria);

      const generationTime = Date.now() - startTime;
      enhancedLeaderboard.metadata.generationTime = generationTime;

      logger.info('Enhanced leaderboard generated', {
        criteria,
        participants: enhancedLeaderboard.metadata.totalParticipants,
        generationTime,
        cached: false
      });

      return enhancedLeaderboard;

    } catch (error) {
      logger.error('Failed to generate enhanced leaderboard:', { criteria, error });
      throw error;
    }
  }

  /**
   * Generate a fresh leaderboard from the database
   */
  private static async generateFreshLeaderboard(
    criteria: LeaderboardCriteria,
    limit: number
  ): Promise<any> {
    const matchStage: any = {};

    // Apply filters based on criteria
    if (criteria.grade) {
      matchStage.grade = criteria.grade;
    }

    if (criteria.subject) {
      matchStage.subject = new RegExp(criteria.subject, 'i');
    }

    // Time-based filtering
    if (criteria.timeframe !== 'all_time') {
      const dateFilter = this.getDateFilter(criteria);
      if (dateFilter) {
        matchStage.lastCalculatedAt = dateFilter;
      }
    }

    // Build aggregation pipeline
    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: 1,
          username: '$user.username',
          grade: 1,
          subject: 1,
          bestScore: '$stats.bestScore',
          averageScore: '$stats.averageScore',
          totalQuizzes: '$stats.totalQuizzes',
          consistency: '$stats.consistency',
          lastAttemptDate: '$lastCalculatedAt',
          improving: '$trends.improving'
        }
      },
      {
        $sort: this.getSortCriteria(criteria.sortBy || 'score')
      },
      { $limit: limit * 2 }, // Get more data for statistics
      {
        $group: {
          _id: null,
          rankings: { $push: '$$ROOT' },
          totalParticipants: { $sum: 1 },
          averageScore: { $avg: '$averageScore' },
          topScore: { $max: '$bestScore' },
          scores: { $push: '$averageScore' }
        }
      }
    ];

    const result = await PerformanceHistory.aggregate(pipeline);
    const data = result[0] || {
      rankings: [],
      totalParticipants: 0,
      averageScore: 0,
      topScore: 0,
      scores: []
    };

    // Add ranks and limit to requested size
    const rankedData = data.rankings.slice(0, limit).map((ranking: any, index: number) => ({
      ...ranking,
      rank: index + 1,
      score: ranking.bestScore || ranking.averageScore,
      badge: this.generateBadge(index + 1, ranking.consistency || 0)
    }));

    return {
      type: this.getLeaderboardType(criteria),
      criteria,
      rankings: rankedData,
      metadata: {
        totalParticipants: data.totalParticipants,
        lastUpdated: new Date(),
        cacheExpiry: new Date(Date.now() + this.CACHE_TTL),
        isCached: false,
        criteria
      },
      statistics: {
        averageScore: Math.round(data.averageScore * 100) / 100,
        medianScore: this.calculateMedian(data.scores),
        topScore: data.topScore,
        participationRate: this.calculateParticipationRate(data.totalParticipants, criteria)
      }
    };
  }

  /**
   * Enhance leaderboard with user context and additional statistics
   */
  private static async enhanceLeaderboard(
    leaderboard: any,
    userId?: ObjectId,
    criteria?: LeaderboardCriteria
  ): Promise<EnhancedLeaderboard> {
    const enhanced: EnhancedLeaderboard = {
      ...leaderboard,
      statistics: {
        ...leaderboard.statistics,
        gradeDistribution: await this.getGradeDistribution(criteria),
        subjectDistribution: await this.getSubjectDistribution(criteria)
      }
    };

    // Add user context if user is specified
    if (userId) {
      enhanced.userContext = await this.generateUserContext(userId, leaderboard.rankings, criteria);
    }

    return enhanced;
  }

  /**
   * Generate user-specific context for the leaderboard
   */
  private static async generateUserContext(
    userId: ObjectId,
    rankings: LeaderboardRanking[],
    criteria?: LeaderboardCriteria
  ): Promise<any> {
    const userRanking = rankings.find(r => r.userId.toString() === userId.toString());
    
    if (!userRanking) {
      // User not in top rankings, find their actual rank
      const userRank = await this.getUserActualRank(userId, criteria);
      return {
        userRank: userRank || null,
        userScore: 0,
        rankingTrend: 'new',
        nearbyRankings: []
      };
    }

    // Get nearby rankings (users around current user)
    const userIndex = rankings.findIndex(r => r.userId.toString() === userId.toString());
    const startIndex = Math.max(0, userIndex - this.NEARBY_RANKINGS_COUNT);
    const endIndex = Math.min(rankings.length, userIndex + this.NEARBY_RANKINGS_COUNT + 1);
    const nearbyRankings = rankings.slice(startIndex, endIndex);

    // Calculate ranking trend (this would require historical data)
    const rankingTrend = await this.calculateRankingTrend(userId, criteria);

    return {
      userRank: userRanking.rank,
      userScore: userRanking.score,
      rankingTrend,
      nearbyRankings
    };
  }

  /**
   * Get cached leaderboard
   */
  private static async getCachedLeaderboard(cacheKey: string): Promise<any | null> {
    try {
      const cached = await Leaderboard.findOne({
        type: cacheKey,
        'metadata.cacheExpiry': { $gt: new Date() }
      });

      if (cached) {
        cached.metadata.isCached = true;
        return cached.toObject();
      }

      return null;
    } catch (error) {
      logger.error('Error retrieving cached leaderboard:', { cacheKey, error });
      return null;
    }
  }

  /**
   * Cache leaderboard to database
   */
  private static async cacheLeaderboard(cacheKey: string, leaderboard: any): Promise<void> {
    try {
      await Leaderboard.findOneAndUpdate(
        { type: cacheKey },
        {
          type: cacheKey,
          criteria: leaderboard.criteria,
          rankings: leaderboard.rankings,
          metadata: leaderboard.metadata
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      logger.error('Error caching leaderboard:', { cacheKey, error });
    }
  }

  /**
   * Check if cache is expired
   */
  private static isCacheExpired(leaderboard: any): boolean {
    return new Date() > new Date(leaderboard.metadata.cacheExpiry);
  }

  /**
   * Enhance cached leaderboard with user context
   */
  private static enhanceWithUserContext(
    cachedLeaderboard: any,
    userId?: ObjectId,
    limit?: number
  ): EnhancedLeaderboard {
    const enhanced = { ...cachedLeaderboard };
    enhanced.metadata.isCached = true;

    if (limit && enhanced.rankings) {
      enhanced.rankings = enhanced.rankings.slice(0, limit);
    }

    // Add user context for cached data (simplified)
    if (userId && enhanced.rankings) {
      const userRanking = enhanced.rankings.find((r: any) => 
        r.userId.toString() === userId.toString()
      );
      
      if (userRanking) {
        enhanced.userContext = {
          userRank: userRanking.rank,
          userScore: userRanking.score,
          rankingTrend: 'stable',
          nearbyRankings: []
        };
      }
    }

    return enhanced;
  }

  /**
   * Generate cache key for leaderboard
   */
  private static generateCacheKey(criteria: LeaderboardCriteria): string {
    const parts = [
      criteria.type || 'overall',
      criteria.timeframe,
      criteria.grade || 'all',
      criteria.subject || 'all',
      criteria.sortBy || 'score'
    ];
    return parts.join('_');
  }

  /**
   * Get date filter based on timeframe
   */
  private static getDateFilter(criteria: LeaderboardCriteria): any {
    const now = new Date();

    switch (criteria.timeframe) {
      case 'daily':
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        return { $gte: dayStart };

      case 'weekly':
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return { $gte: weekAgo };

      case 'monthly':
        const month = criteria.month || (now.getMonth() + 1);
        const year = criteria.year || now.getFullYear();
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        return { $gte: startDate, $lte: endDate };

      default:
        return null;
    }
  }

  /**
   * Get sort criteria based on sort type
   */
  private static getSortCriteria(sortBy: string): any {
    switch (sortBy) {
      case 'average':
        return { 'stats.averageScore': -1, 'stats.totalQuizzes': -1 };
      case 'consistency':
        return { 'stats.consistency': -1, 'stats.averageScore': -1 };
      case 'quizzes':
        return { 'stats.totalQuizzes': -1, 'stats.averageScore': -1 };
      default: // 'score' or 'best'
        return { 'stats.bestScore': -1, 'stats.averageScore': -1 };
    }
  }

  /**
   * Generate badge based on rank and performance
   */
  private static generateBadge(rank: number, consistency: number): string {
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '⭐';
    if (consistency >= 80) return '🎯';
    return '';
  }

  /**
   * Calculate median score
   */
  private static calculateMedian(scores: number[]): number {
    if (scores.length === 0) return 0;
    
    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      const left = sorted[mid - 1];
      const right = sorted[mid];
      return left !== undefined && right !== undefined ? (left + right) / 2 : 0;
    } else {
      const middle = sorted[mid];
      return middle !== undefined ? middle : 0;
    }
  }

  /**
   * Calculate participation rate (placeholder implementation)
   */
  private static calculateParticipationRate(participants: number, criteria?: LeaderboardCriteria): number {
    // This would require total user count from user service
    // For now, return a calculated estimate
    return Math.min(100, (participants / 100) * 100);
  }

  /**
   * Get grade distribution
   */
  private static async getGradeDistribution(criteria?: LeaderboardCriteria): Promise<Record<string, number>> {
    try {
      const matchStage: any = {};
      if (criteria && criteria.timeframe !== 'all_time') {
        const dateFilter = this.getDateFilter(criteria);
        if (dateFilter) matchStage.lastCalculatedAt = dateFilter;
      }

      const pipeline: PipelineStage[] = [
        { $match: matchStage },
        {
          $group: {
            _id: '$grade',
            count: { $sum: 1 }
          }
        }
      ];

      const result = await PerformanceHistory.aggregate(pipeline);
      const distribution: Record<string, number> = {};
      
      result.forEach(item => {
        if (item._id) {
          distribution[`Grade ${item._id}`] = item.count;
        }
      });

      return distribution;
    } catch (error) {
      logger.error('Error calculating grade distribution:', error);
      return {};
    }
  }

  /**
   * Get subject distribution
   */
  private static async getSubjectDistribution(criteria?: LeaderboardCriteria): Promise<Record<string, number>> {
    try {
      const matchStage: any = {};
      if (criteria && criteria.timeframe !== 'all_time') {
        const dateFilter = this.getDateFilter(criteria);
        if (dateFilter) matchStage.lastCalculatedAt = dateFilter;
      }

      const pipeline: PipelineStage[] = [
        { $match: matchStage },
        {
          $group: {
            _id: '$subject',
            count: { $sum: 1 }
          }
        }
      ];

      const result = await PerformanceHistory.aggregate(pipeline);
      const distribution: Record<string, number> = {};
      
      result.forEach(item => {
        if (item._id) {
          distribution[item._id] = item.count;
        }
      });

      return distribution;
    } catch (error) {
      logger.error('Error calculating subject distribution:', error);
      return {};
    }
  }

  /**
   * Get leaderboard type string
   */
  private static getLeaderboardType(criteria: LeaderboardCriteria): string {
    const parts = [];
    
    if (criteria.grade && criteria.subject) {
      parts.push(`grade_${criteria.grade}_${criteria.subject}`);
    } else if (criteria.grade) {
      parts.push(`grade_${criteria.grade}`);
    } else if (criteria.subject) {
      parts.push(`subject_${criteria.subject}`);
    } else {
      parts.push('overall');
    }
    
    parts.push(criteria.timeframe);
    
    return parts.join('_');
  }

  /**
   * Get user's actual rank (when not in top rankings)
   */
  private static async getUserActualRank(userId: ObjectId, criteria?: LeaderboardCriteria): Promise<number | null> {
    try {
      const matchStage: any = {};
      
      if (criteria?.grade) matchStage.grade = criteria.grade;
      if (criteria?.subject) matchStage.subject = new RegExp(criteria.subject, 'i');
      if (criteria && criteria.timeframe !== 'all_time') {
        const dateFilter = this.getDateFilter(criteria);
        if (dateFilter) matchStage.lastCalculatedAt = dateFilter;
      }

      const pipeline: PipelineStage[] = [
        { $match: matchStage },
        {
          $project: {
            userId: 1,
            score: '$stats.bestScore'
          }
        },
        { $sort: { score: -1 } },
        {
          $group: {
            _id: null,
            users: { $push: '$$ROOT' }
          }
        },
        {
          $unwind: {
            path: '$users',
            includeArrayIndex: 'rank'
          }
        },
        {
          $match: {
            'users.userId': userId
          }
        }
      ];

      const result = await PerformanceHistory.aggregate(pipeline);
      return result[0] ? result[0].rank + 1 : null;
    } catch (error) {
      logger.error('Error getting user actual rank:', { userId, error });
      return null;
    }
  }

  /**
   * Calculate ranking trend (placeholder implementation)
   */
  private static async calculateRankingTrend(userId: ObjectId, criteria?: LeaderboardCriteria): Promise<'up' | 'down' | 'stable' | 'new'> {
    // This would require historical leaderboard data
    // For now, return a simple trend based on user's recent performance
    try {
      const userPerformance = await PerformanceHistory.findOne({ userId });
      if (!userPerformance) return 'new';
      
      return userPerformance.trends.improving ? 'up' : 'stable';
    } catch (error) {
      logger.error('Error calculating ranking trend:', { userId, error });
      return 'stable';
    }
  }
}
