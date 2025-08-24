import { getSubmissionServiceClient, getAnalyticsServiceClient } from '../config/serviceClient.js';
import { logger } from '../utils/logger.js';
import type { ObjectId } from '../types/index.js';

export interface SubmissionData {
  _id: string;
  scoring: {
    scorePercentage: number;
    grade: string;
  };
  timing: {
    submittedAt: string;
  };
  metadata?: {
    subject?: string;
    grade?: number;
  };
  difficulty?: string;
}

export interface UserPerformanceData {
  averageScore: number;
  totalQuizzes: number;
  strongSubjects?: string[];
  weakSubjects?: string[];
  recentPerformance?: Array<{
    score: number;
    date: Date;
    subject: string;
  }>;
  subjectPerformance?: Record<string, {
    averageScore: number;
    totalQuizzes: number;
    lastAttempt?: Date;
  }>;
  difficultyPerformance?: {
    easy: { correct: number; total: number; avgTime: number };
    medium: { correct: number; total: number; avgTime: number };
    hard: { correct: number; total: number; avgTime: number };
  };
}

export class UserPerformanceService {
  /**
   * Fetch comprehensive user performance data for adaptive quiz generation
   */
  static async fetchUserPerformanceData(
    userId: ObjectId,
    subject: string,
    authHeader: string
  ): Promise<UserPerformanceData> {
    try {
      // Fetch recent submissions for overall performance
      const recentSubmissions = await this.fetchRecentSubmissions(userId, authHeader);
      
      // Fetch analytics data for subject-specific performance
      const analyticsData = await this.fetchAnalyticsData(userId, subject, authHeader);
      
      // Process and combine the data
      const performanceData = this.processPerformanceData(recentSubmissions, analyticsData, subject);
      
      logger.info('User performance data fetched successfully:', {
        userId,
        subject,
        totalQuizzes: performanceData.totalQuizzes,
        averageScore: performanceData.averageScore,
        subjectSpecific: !!performanceData.subjectPerformance?.[subject.toLowerCase()]
      });

      return performanceData;

    } catch (error) {
      logger.error('Failed to fetch user performance data:', {
        userId,
        subject,
        error: (error as Error).message
      });
      
      // Return default performance data for new users
      return this.getDefaultPerformanceData();
    }
  }

  /**
   * Fetch recent submissions from submission service
   */
  private static async fetchRecentSubmissions(userId: ObjectId, authHeader: string) {
    try {
      const submissionServiceClient = getSubmissionServiceClient();
      const response = await submissionServiceClient.get<{
        success: boolean;
        data: {
          submissions: any[];
        };
      }>('/api/submission', {
        params: {
          limit: 20,
          sortBy: 'timing.submittedAt',
          sortOrder: 'desc'
        },
        headers: { Authorization: authHeader }
      });

      if (response.success && response.data.submissions) {
        return response.data.submissions;
      }

      return [];
    } catch (error) {
      logger.warn('Failed to fetch recent submissions:', error);
      return [];
    }
  }

  /**
   * Fetch analytics data from analytics service
   */
  private static async fetchAnalyticsData(userId: ObjectId, subject: string, authHeader: string) {
    try {
      const analyticsServiceClient = getAnalyticsServiceClient();
      
      // Try to get overall performance
      const overallResponse = await analyticsServiceClient.get<{
        success: boolean;
        data: any;
      }>('/api/analytics/performance', {
        headers: { Authorization: authHeader }
      });

      let subjectResponse = null;
      try {
        // Try to get subject-specific performance
        subjectResponse = await analyticsServiceClient.get<{
          success: boolean;
          data: any;
        }>(`/api/analytics/performance/${encodeURIComponent(subject)}/all`, {
          headers: { Authorization: authHeader }
        });
      } catch (subjectError) {
        logger.debug('Subject-specific analytics not available:', { subject });
      }

      return {
        overall: overallResponse.success ? overallResponse.data : null,
        subject: subjectResponse?.success ? subjectResponse.data : null
      };
    } catch (error) {
      logger.warn('Failed to fetch analytics data:', error);
      return { overall: null, subject: null };
    }
  }

  /**
   * Process raw data into structured performance data
   */
  private static processPerformanceData(
    submissions: SubmissionData[],
    analyticsData: any,
    targetSubject: string
  ): UserPerformanceData {
    // Calculate overall metrics
    const totalQuizzes = submissions.length;
    const averageScore = totalQuizzes > 0 
      ? submissions.reduce((sum: number, sub: SubmissionData) => sum + sub.scoring.scorePercentage, 0) / totalQuizzes 
      : 0;

    // Process recent performance
    const recentPerformance = submissions.slice(0, 10).map(sub => ({
      score: sub.scoring.scorePercentage,
      date: new Date(sub.timing.submittedAt),
      subject: sub.metadata?.subject || 'Unknown'
    }));

    // Group by subject
    const subjectGroups = submissions.reduce((acc: Record<string, SubmissionData[]>, sub: SubmissionData) => {
      const subject = (sub.metadata?.subject || 'Unknown').toLowerCase();
      if (!acc[subject]) {
        acc[subject] = [];
      }
      acc[subject].push(sub);
      return acc;
    }, {} as Record<string, SubmissionData[]>);

    // Calculate subject-specific performance
    const subjectPerformance: Record<string, any> = {};
    Object.entries(subjectGroups).forEach(([subject, subs]: [string, SubmissionData[]]) => {
      const avgScore = subs.reduce((sum: number, sub: SubmissionData) => sum + sub.scoring.scorePercentage, 0) / subs.length;
      const lastAttempt = subs.length > 0 && subs[0]?.timing?.submittedAt ? new Date(subs[0].timing.submittedAt) : undefined;
      
      subjectPerformance[subject] = {
        averageScore: avgScore,
        totalQuizzes: subs.length,
        lastAttempt
      };
    });

    // Analyze difficulty performance
    const difficultyPerformance = this.analyzeDifficultyPerformance(submissions);

    // Identify strong and weak subjects
    const strongSubjects: string[] = [];
    const weakSubjects: string[] = [];

    Object.entries(subjectPerformance).forEach(([subject, data]) => {
      if (data.totalQuizzes >= 2) { // Only consider subjects with enough attempts
        if (data.averageScore >= 75) {
          strongSubjects.push(subject);
        } else if (data.averageScore < 60) {
          weakSubjects.push(subject);
        }
      }
    });

    return {
      averageScore: Math.round(averageScore * 100) / 100,
      totalQuizzes,
      strongSubjects,
      weakSubjects,
      recentPerformance,
      subjectPerformance,
      difficultyPerformance
    };
  }

  /**
   * Analyze performance by difficulty level
   */
  private static analyzeDifficultyPerformance(submissions: any[]) {
    const difficultyStats = {
      easy: { correct: 0, total: 0, totalTime: 0 },
      medium: { correct: 0, total: 0, totalTime: 0 },
      hard: { correct: 0, total: 0, totalTime: 0 }
    };

    submissions.forEach(submission => {
      if (submission.answers && Array.isArray(submission.answers)) {
        submission.answers.forEach((answer: any) => {
          // Note: This assumes difficulty is stored in answer metadata
          // If not available, we'll need to fetch question details
          const difficulty = answer.difficulty?.toLowerCase() || 'medium';
          
          if (difficultyStats[difficulty as keyof typeof difficultyStats]) {
            const stats = difficultyStats[difficulty as keyof typeof difficultyStats];
            stats.total++;
            if (answer.isCorrect) {
              stats.correct++;
            }
            stats.totalTime += answer.timeSpent || 0;
          }
        });
      }
    });

    // Calculate averages
    return {
      easy: {
        correct: difficultyStats.easy.correct,
        total: difficultyStats.easy.total,
        avgTime: difficultyStats.easy.total > 0 ? difficultyStats.easy.totalTime / difficultyStats.easy.total : 0
      },
      medium: {
        correct: difficultyStats.medium.correct,
        total: difficultyStats.medium.total,
        avgTime: difficultyStats.medium.total > 0 ? difficultyStats.medium.totalTime / difficultyStats.medium.total : 0
      },
      hard: {
        correct: difficultyStats.hard.correct,
        total: difficultyStats.hard.total,
        avgTime: difficultyStats.hard.total > 0 ? difficultyStats.hard.totalTime / difficultyStats.hard.total : 0
      }
    };
  }

  /**
   * Get default performance data for new users
   */
  private static getDefaultPerformanceData(): UserPerformanceData {
    return {
      averageScore: 0,
      totalQuizzes: 0,
      strongSubjects: [],
      weakSubjects: [],
      recentPerformance: [],
      subjectPerformance: {},
      difficultyPerformance: {
        easy: { correct: 0, total: 0, avgTime: 0 },
        medium: { correct: 0, total: 0, avgTime: 0 },
        hard: { correct: 0, total: 0, avgTime: 0 }
      }
    };
  }

  /**
   * Generate adaptive parameters for quiz generation based on performance
   */
  static generateAdaptiveParameters(
    baseParams: any,
    performanceData: UserPerformanceData
  ) {
    return {
      baseParams: {
        grade: baseParams.grade,
        subject: baseParams.subject,
        totalQuestions: baseParams.totalQuestions,
        topics: baseParams.topics
      },
      userPerformanceData: performanceData
    };
  }
}
