import {getSubmissionServiceClient} from '../config/serviceClient.js';
import type {PipelineStage} from 'mongoose';
import {PerformanceHistory} from '../models/PerformanceHistory.js';
import {Leaderboard} from '../models/Leaderboard.js';
import {logger} from '../utils/logger.js';
import type {
  PerformanceStats,
  RecentPerformance,
  PerformanceTrends,
  TopicWiseStats,
  LeaderboardCriteria,
  ObjectId,
} from '../types/index.js';

export class AnalyticsService {

  static async updateUserPerformance(
      userId: ObjectId, subject: string,
      grade: number, submissionData: any,
  ): Promise<void> {
    try {
      // Normalize subject name to prevent case-sensitivity issues
      const normalizedSubject = subject.trim().toLowerCase().replace(/\s+/g, ' ');
      
      // Find or create performance history using case-insensitive search
      let performance = await PerformanceHistory.findOne({
        userId, 
        subject: { $regex: new RegExp(`^${normalizedSubject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, 
        grade,
      });

      if (!performance) {
        performance = new PerformanceHistory({
          userId, 
          subject: subject.trim(), // Keep original case for display
          grade, 
          stats: {
            totalQuizzes: 0,
            averageScore: 0,
            bestScore: 0,
            worstScore: 100,
            totalTimeSpent: 0,
            consistency: 0,
          }, recentPerformance: [], trends: {
            improving: true,
            trendDirection: 'stable',
            recommendedDifficulty: 'medium',
          }, topicWiseStats: [], lastCalculatedAt: new Date(),
        });
      }

      // Update stats
      const stats = performance.stats;
      const newScore = submissionData.scoring.scorePercentage;
      const newTimeSpent = Math.round(submissionData.timing.totalTimeSpent /
          60); // Convert to minutes

      stats.totalQuizzes += 1;
      stats.averageScore = ((stats.averageScore * (stats.totalQuizzes - 1)) +
          newScore) / stats.totalQuizzes;
      stats.bestScore = Math.max(stats.bestScore, newScore);
      stats.worstScore = Math.min(stats.worstScore, newScore);
      stats.totalTimeSpent += newTimeSpent;

      // Calculate consistency (lower variance = higher consistency)
      const recentScores = [
        ...performance.recentPerformance.map(p => p.score), newScore,
      ];
      const variance = this.calculateVariance(recentScores);
      stats.consistency = Math.max(0, 100 - variance);

      // Update recent performance (keep last 20)
      performance.recentPerformance.unshift({
        date: new Date(),
        score: newScore,
        quizId: submissionData.quizId,
        difficulty: submissionData.difficulty || 'medium',
      });

      if (performance.recentPerformance.length > 20) {
        performance.recentPerformance = performance.recentPerformance.slice(0,
            20,
        );
      }

      // Update trends
      performance.trends = this.calculateTrends(performance.recentPerformance,
          stats.averageScore,
      );

      // Update topic-wise stats
      if (submissionData.answers && Array.isArray(submissionData.answers)) {
        performance.topicWiseStats = this.updateTopicStats(performance.topicWiseStats,
            submissionData.answers,
        );
      }

      performance.lastCalculatedAt = new Date();
      await performance.save();

      logger.info('User performance updated:', {
        userId, subject, grade, newScore, totalQuizzes: stats.totalQuizzes,
      });

    } catch (error) {
      logger.error('Failed to update user performance:', {
        userId, subject, grade, error,
      });
      throw error;
    }
  }

  static async generateLeaderboard(
      criteria: LeaderboardCriteria, limit: number = 50): Promise<any> {
    try {
      // Build aggregation pipeline
      const matchStage: any = {};

      if (criteria.grade) matchStage.grade = criteria.grade;
      if (criteria.subject) {
        matchStage.subject = new RegExp(criteria.subject, 'i');
      }

      // Time-based filtering
      if (criteria.timeframe !== 'all_time') {
        const dateFilter = this.getDateFilter(criteria);
        matchStage.lastCalculatedAt = dateFilter;
      }

      const pipeline: PipelineStage[] = [
        {$match: matchStage}, {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        }, {$unwind: '$user'}, {
          $project: {
            userId: 1,
            username: '$user.username',
            score: '$stats.averageScore',
            totalQuizzes: '$stats.totalQuizzes',
            lastAttemptDate: '$lastCalculatedAt',
          },
        }, {$sort: {score: -1, totalQuizzes: -1}}, {$limit: limit}, {
          $group: {
            _id: null, rankings: {
              $push: {
                userId: '$userId',
                username: '$username',
                score: '$score',
                totalQuizzes: '$totalQuizzes',
                lastAttemptDate: '$lastAttemptDate',
              },
            },
          },
        }, {
          $unwind: {
            path: '$rankings', includeArrayIndex: 'rank',
          },
        }, {
          $addFields: {
            'rankings.rank': {$add: ['$rank', 1]},
          },
        }, {
          $group: {
            _id: null,
            rankings: {$push: '$rankings'},
            totalParticipants: {$sum: 1},
          },
        },
      ];

      const result = await PerformanceHistory.aggregate(pipeline);
      const leaderboardData = result[0] || {rankings: [], totalParticipants: 0};

      const leaderboard = {
        type: this.getLeaderboardType(criteria),
        criteria,
        rankings: leaderboardData.rankings,
        metadata: {
          totalParticipants: leaderboardData.totalParticipants,
          lastUpdated: new Date(),
          cacheExpiry: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        },
      };

      // Cache the leaderboard
      await this.cacheLeaderboard(leaderboard);

      return leaderboard;

    } catch (error) {
      logger.error('Failed to generate leaderboard:', {criteria, error});
      throw error;
    }
  }

  private static calculateVariance(scores: number[]): number {
    if (scores.length <= 1) return 0;

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum +
        Math.pow(score - mean, 2), 0) / scores.length;

    return Math.sqrt(variance);
  }

  private static calculateTrends(
      recentPerformance: RecentPerformance[],
      averageScore: number,
  ): PerformanceTrends {
    if (recentPerformance.length < 3) {
      return {
        improving: true,
        trendDirection: 'stable',
        recommendedDifficulty: 'medium',
      };
    }

    // Get last 3 performances
    const recent = recentPerformance.slice(0, 3);
    const avgRecent = recent.reduce((sum, p) => sum + p.score, 0) /
        recent.length;

    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    let improving = true;

    if (avgRecent > averageScore + 5) {
      trendDirection = 'up';
      improving = true;
    } else if (avgRecent < averageScore - 5) {
      trendDirection = 'down';
      improving = false;
    }

    // Recommend difficulty based on recent performance
    let recommendedDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
    if (avgRecent >= 85) {
      recommendedDifficulty = 'hard';
    } else if (avgRecent < 65) {
      recommendedDifficulty = 'easy';
    }

    return {
      improving, trendDirection, recommendedDifficulty,
    };
  }

  private static updateTopicStats(
      currentStats: TopicWiseStats[],
      answers: any[],
  ): TopicWiseStats[] {
    const topicMap = new Map<string, TopicWiseStats>();

    // Initialize with current stats
    currentStats.forEach(stat => {
      topicMap.set(stat.topic, {...stat});
    });

    // Process new answers
    answers.forEach(answer => {
      if (!answer.topic) return;

      const topic = answer.topic;
      const existing = topicMap.get(topic) || {
        topic,
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        avgTimePerQuestion: 0,
      };

      existing.totalQuestions += 1;
      if (answer.isCorrect) {
        existing.correctAnswers += 1;
      }
      existing.accuracy = (existing.correctAnswers / existing.totalQuestions) *
          100;

      // Update average time (simplified)
      const currentAvgTime = existing.avgTimePerQuestion;
      const newTime = answer.timeSpent || 0;
      existing.avgTimePerQuestion = ((currentAvgTime *
          (existing.totalQuestions - 1)) + newTime) / existing.totalQuestions;

      topicMap.set(topic, existing);
    });

    return Array.from(topicMap.values());
  }

  private static getDateFilter(criteria: LeaderboardCriteria): any {
    const now = new Date();

    if (criteria.timeframe === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return {$gte: weekAgo};
    }

    if (criteria.timeframe === 'monthly') {
      const month = criteria.month || now.getMonth() + 1;
      const year = criteria.year || now.getFullYear();

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      return {$gte: startDate, $lte: endDate};
    }

    return {};
  }

  private static getLeaderboardType(criteria: LeaderboardCriteria): string {
    if (criteria.grade && criteria.subject) {
      return `grade_${criteria.grade}_${criteria.subject}_${criteria.timeframe}`;
    }
    return `overall_${criteria.timeframe}`;
  }

  private static async cacheLeaderboard(leaderboard: any): Promise<void> {
    try {
      // Save to database for caching
      await Leaderboard.findOneAndUpdate({
        type: leaderboard.type, criteria: leaderboard.criteria,
      }, leaderboard, {upsert: true, new: true});
    } catch (error) {
      logger.error('Failed to cache leaderboard:', error);
    }
  }
}
