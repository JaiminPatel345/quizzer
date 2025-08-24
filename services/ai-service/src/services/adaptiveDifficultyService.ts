import { logger } from '../utils/logger.js';
import type { SubmissionAnswer } from '../types/index.js';

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

export interface DifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

export interface AdaptiveRecommendation {
  difficultyDistribution: DifficultyDistribution;
  reasoning: string[];
  confidenceLevel: 'low' | 'medium' | 'high';
  suggestedTopics?: string[];
  adaptationFactors: {
    performanceScore: number;
    consistencyScore: number;
    improvementTrend: number;
    subjectFamiliarity: number;
  };
}

export class AdaptiveDifficultyService {
  /**
   * Calculate adaptive difficulty distribution based on comprehensive user performance
   */
  static calculateAdaptiveDifficulty(
    performanceData: UserPerformanceData,
    subject: string,
    requestedDifficulty?: string
  ): AdaptiveRecommendation {
    const factors = this.analyzePerformanceFactors(performanceData, subject);
    const distribution = this.calculateDistribution(factors, requestedDifficulty);
    const reasoning = this.generateReasoning(factors, distribution);
    
    return {
      difficultyDistribution: distribution,
      reasoning,
      confidenceLevel: this.determineConfidence(performanceData),
      suggestedTopics: this.suggestFocusTopics(performanceData, subject),
      adaptationFactors: factors
    };
  }

  /**
   * Analyze multiple performance factors
   */
  private static analyzePerformanceFactors(
    performanceData: UserPerformanceData,
    subject: string
  ) {
    // Performance Score Factor (0-100)
    const performanceScore = this.calculatePerformanceScore(performanceData, subject);

    // Consistency Factor (0-100) - measures how consistent the user's performance is
    const consistencyScore = this.calculateConsistencyScore(performanceData);

    // Improvement Trend Factor (-50 to +50) - measures if user is improving or declining
    const improvementTrend = this.calculateImprovementTrend(performanceData);

    // Subject Familiarity Factor (0-100) - how familiar user is with this specific subject
    const subjectFamiliarity = this.calculateSubjectFamiliarity(performanceData, subject);

    return {
      performanceScore,
      consistencyScore,
      improvementTrend,
      subjectFamiliarity
    };
  }

  /**
   * Calculate overall performance score with subject-specific weighting
   */
  private static calculatePerformanceScore(
    performanceData: UserPerformanceData,
    subject: string
  ): number {
    const globalAverage = performanceData.averageScore || 0;
    const subjectData = performanceData.subjectPerformance?.[subject.toLowerCase()];
    
    if (subjectData && subjectData.totalQuizzes >= 2) {
      // Weight subject-specific performance more if we have enough data
      return Math.round(globalAverage * 0.3 + subjectData.averageScore * 0.7);
    }
    
    return Math.round(globalAverage);
  }

  /**
   * Calculate consistency score based on recent performance variance
   */
  private static calculateConsistencyScore(performanceData: UserPerformanceData): number {
    const recentScores = performanceData.recentPerformance?.slice(0, 5).map(p => p.score) || [];
    
    if (recentScores.length < 2) {
      return 50; // Default medium consistency
    }

    const mean = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const variance = recentScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / recentScores.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    // Scale: 0-20 stdev = 100-50 consistency, 20+ stdev = 50-0 consistency
    const consistencyScore = Math.max(0, Math.min(100, 100 - (standardDeviation * 2.5)));
    
    return Math.round(consistencyScore);
  }

  /**
   * Calculate improvement trend over recent attempts
   */
  private static calculateImprovementTrend(performanceData: UserPerformanceData): number {
    const recent = performanceData.recentPerformance?.slice(0, 5) || [];
    
    if (recent.length < 3) {
      return 0; // Neutral trend
    }

    // Sort by date (newest first)
    const sorted = recent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentAvg = sorted.slice(0, 2).reduce((sum, p) => sum + p.score, 0) / 2;
    const olderAvg = sorted.slice(2).reduce((sum, p) => sum + p.score, 0) / (sorted.length - 2);

    const trend = recentAvg - olderAvg;
    
    // Clamp between -50 and +50
    return Math.max(-50, Math.min(50, Math.round(trend)));
  }

  /**
   * Calculate subject familiarity based on attempts and recency
   */
  private static calculateSubjectFamiliarity(
    performanceData: UserPerformanceData,
    subject: string
  ): number {
    const subjectData = performanceData.subjectPerformance?.[subject.toLowerCase()];
    
    if (!subjectData) {
      return 0; // Completely new subject
    }

    const attemptsFactor = Math.min(100, (subjectData.totalQuizzes / 10) * 100); // 10 attempts = 100% familiarity
    
    // Recency factor - how recent was the last attempt
    let recencyFactor = 100;
    if (subjectData.lastAttempt) {
      const daysSinceLastAttempt = (Date.now() - new Date(subjectData.lastAttempt).getTime()) / (1000 * 60 * 60 * 24);
      recencyFactor = Math.max(20, 100 - (daysSinceLastAttempt * 2)); // Decay over time
    }

    return Math.round((attemptsFactor * 0.7) + (recencyFactor * 0.3));
  }

  /**
   * Calculate difficulty distribution based on analyzed factors
   */
  private static calculateDistribution(
    factors: any,
    requestedDifficulty?: string
  ): DifficultyDistribution {
    // If user specifically requested a difficulty, respect it but still adapt slightly
    if (requestedDifficulty && requestedDifficulty !== 'mixed') {
      return this.getFixedDifficultyDistribution(requestedDifficulty, factors);
    }

    const { performanceScore, consistencyScore, improvementTrend, subjectFamiliarity } = factors;

    // Base distribution calculation
    let easy: number, medium: number, hard: number;

    // Start with performance-based distribution
    if (performanceScore < 40) {
      // Struggling - focus on easy questions
      easy = 70;
      medium = 25;
      hard = 5;
    } else if (performanceScore < 60) {
      // Below average - mostly easy/medium
      easy = 50;
      medium = 40;
      hard = 10;
    } else if (performanceScore < 75) {
      // Average - balanced with slight easy bias
      easy = 35;
      medium = 45;
      hard = 20;
    } else if (performanceScore < 85) {
      // Good performance - balanced
      easy = 25;
      medium = 50;
      hard = 25;
    } else {
      // Excellent - challenge with harder questions
      easy = 15;
      medium = 40;
      hard = 45;
    }

    // Adjust based on consistency
    if (consistencyScore < 30) {
      // Very inconsistent - add more easy questions for confidence
      easy += 10;
      hard -= 10;
    } else if (consistencyScore > 80) {
      // Very consistent - can handle more challenging content
      hard += 5;
      easy -= 5;
    }

    // Adjust based on improvement trend
    if (improvementTrend > 20) {
      // Strong improvement - gradually increase difficulty
      hard += 5;
      medium += 5;
      easy -= 10;
    } else if (improvementTrend < -20) {
      // Declining performance - provide more support
      easy += 10;
      hard -= 10;
    }

    // Adjust based on subject familiarity
    if (subjectFamiliarity < 20) {
      // New subject - start easier
      easy += 15;
      medium += 5;
      hard -= 20;
    } else if (subjectFamiliarity > 80) {
      // Very familiar - can handle complexity
      hard += 10;
      easy -= 10;
    }

    // Ensure values are within bounds and sum to 100
    easy = Math.max(10, Math.min(80, easy));
    hard = Math.max(5, Math.min(60, hard));
    medium = 100 - easy - hard;

    // Final bounds check
    if (medium < 10) {
      const excess = 10 - medium;
      medium = 10;
      if (easy > hard) {
        easy -= excess;
      } else {
        hard -= excess;
      }
    }

    return { easy: Math.round(easy), medium: Math.round(medium), hard: Math.round(hard) };
  }

  /**
   * Get distribution for fixed difficulty with slight adaptation
   */
  private static getFixedDifficultyDistribution(
    difficulty: string,
    factors: any
  ): DifficultyDistribution {
    const { performanceScore } = factors;

    switch (difficulty) {
      case 'easy':
        return performanceScore < 50 
          ? { easy: 90, medium: 10, hard: 0 }
          : { easy: 80, medium: 15, hard: 5 };
      
      case 'medium':
        return performanceScore < 50 
          ? { easy: 40, medium: 50, hard: 10 }
          : performanceScore > 80 
          ? { easy: 10, medium: 70, hard: 20 }
          : { easy: 20, medium: 70, hard: 10 };
      
      case 'hard':
        return performanceScore < 60 
          ? { easy: 20, medium: 50, hard: 30 }
          : { easy: 5, medium: 35, hard: 60 };
      
      default:
        return { easy: 30, medium: 50, hard: 20 };
    }
  }

  /**
   * Generate reasoning for the difficulty distribution
   */
  private static generateReasoning(factors: any, distribution: DifficultyDistribution): string[] {
    const reasoning: string[] = [];
    const { performanceScore, consistencyScore, improvementTrend, subjectFamiliarity } = factors;

    if (performanceScore < 50) {
      reasoning.push(`Focusing on easier questions (${distribution.easy}%) to build confidence based on ${performanceScore}% average performance.`);
    } else if (performanceScore > 80) {
      reasoning.push(`Emphasizing challenging questions (${distribution.hard}%) to match your strong ${performanceScore}% performance level.`);
    } else {
      reasoning.push(`Balanced distribution with ${distribution.medium}% medium questions based on your ${performanceScore}% average performance.`);
    }

    if (consistencyScore < 40) {
      reasoning.push("Added easier questions due to inconsistent performance patterns to help build stability.");
    } else if (consistencyScore > 80) {
      reasoning.push("Increased difficulty slightly due to consistent performance showing readiness for challenges.");
    }

    if (improvementTrend > 15) {
      reasoning.push("Gradually increasing difficulty as your recent scores show strong improvement trend.");
    } else if (improvementTrend < -15) {
      reasoning.push("Providing more foundational questions as recent performance shows some decline.");
    }

    if (subjectFamiliarity < 30) {
      reasoning.push("Starting with easier questions since this appears to be a new or unfamiliar subject area.");
    } else if (subjectFamiliarity > 70) {
      reasoning.push("Leveraging your strong familiarity with this subject to include more advanced questions.");
    }

    return reasoning;
  }

  /**
   * Determine confidence level in the adaptation
   */
  private static determineConfidence(performanceData: UserPerformanceData): 'low' | 'medium' | 'high' {
    const totalQuizzes = performanceData.totalQuizzes || 0;
    const recentQuizzes = performanceData.recentPerformance?.length || 0;

    if (totalQuizzes < 3 || recentQuizzes < 2) {
      return 'low';
    } else if (totalQuizzes < 8 || recentQuizzes < 4) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Suggest topics to focus on based on performance
   */
  private static suggestFocusTopics(
    performanceData: UserPerformanceData,
    subject: string
  ): string[] {
    const suggestions: string[] = [];

    if (performanceData.weakSubjects?.includes(subject)) {
      suggestions.push(`Focus on ${subject} fundamentals`);
    }

    if (performanceData.strongSubjects?.includes(subject)) {
      suggestions.push(`Advanced ${subject} concepts`);
    }

    return suggestions;
  }

  /**
   * Enhanced real-time difficulty adjustment during quiz
   */
  static adjustDifficultyRealTime(
    currentAnswers: SubmissionAnswer[],
    remainingQuestions: number
  ): 'easier' | 'maintain' | 'harder' {
    if (currentAnswers.length < 2) {
      return 'maintain'; // Not enough data for meaningful adjustment
    }

    // Analyze multiple performance indicators
    const analysis = this.analyzeCurrentPerformance(currentAnswers);
    
    // Decision matrix based on multiple factors
    const adjustmentScore = this.calculateAdjustmentScore(analysis, remainingQuestions);
    
    // Determine adjustment with confidence thresholds
    if (adjustmentScore >= 0.7 && remainingQuestions >= 3) {
      return 'harder';
    } else if (adjustmentScore <= -0.7 && remainingQuestions >= 3) {
      return 'easier';
    }
    
    return 'maintain';
  }

  /**
   * Analyze current performance across multiple dimensions
   */
  private static analyzeCurrentPerformance(answers: SubmissionAnswer[]) {
    const totalAnswers = answers.length;
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const accuracyRate = correctAnswers / totalAnswers;

    // Recent performance trend (last 3-5 answers)
    const recentAnswers = answers.slice(-Math.min(5, answers.length));
    const recentCorrect = recentAnswers.filter(a => a.isCorrect).length;
    const recentAccuracy = recentCorrect / recentAnswers.length;

    // Speed analysis
    const averageTime = answers.reduce((sum, a) => sum + a.timeSpent, 0) / totalAnswers;
    const recentAverageTime = recentAnswers.reduce((sum, a) => sum + a.timeSpent, 0) / recentAnswers.length;

    // Hint usage pattern
    const hintUsageRate = answers.reduce((sum, a) => sum + a.hintsUsed, 0) / totalAnswers;

    // Confidence indicators
    const consistencyScore = this.calculateAnswerConsistency(answers);
    const improvementTrend = this.calculateRealTimeImprovementTrend(answers);

    return {
      overallAccuracy: accuracyRate,
      recentAccuracy,
      averageTime,
      recentAverageTime,
      hintUsageRate,
      consistencyScore,
      improvementTrend,
      totalAnswered: totalAnswers
    };
  }

  /**
   * Calculate adjustment score based on performance analysis
   */
  private static calculateAdjustmentScore(analysis: any, remainingQuestions: number): number {
    let score = 0;

    // Accuracy factor (most important)
    if (analysis.recentAccuracy >= 0.8) {
      score += 0.4; // Strong recent performance
    } else if (analysis.recentAccuracy <= 0.4) {
      score -= 0.4; // Poor recent performance
    }

    // Overall accuracy trend
    if (analysis.overallAccuracy >= 0.75) {
      score += 0.2;
    } else if (analysis.overallAccuracy <= 0.5) {
      score -= 0.2;
    }

    // Speed factor
    const speedFactor = this.analyzeSpeedPattern(analysis.averageTime, analysis.recentAverageTime);
    score += speedFactor * 0.15;

    // Hint usage (more hints = struggling)
    if (analysis.hintUsageRate >= 0.5) {
      score -= 0.15;
    } else if (analysis.hintUsageRate <= 0.2) {
      score += 0.1;
    }

    // Consistency bonus/penalty
    score += analysis.consistencyScore * 0.1;

    // Improvement trend
    score += analysis.improvementTrend * 0.1;

    // Remaining questions factor (be more conservative near the end)
    if (remainingQuestions <= 3) {
      score *= 0.7; // Reduce adjustment magnitude near quiz end
    }

    return Math.max(-1, Math.min(1, score)); // Clamp between -1 and 1
  }

  /**
   * Analyze speed patterns to determine if user is comfortable or struggling
   */
  private static analyzeSpeedPattern(avgTime: number, recentAvgTime: number): number {
    const timeThreshold = 90; // 1.5 minutes baseline
    
    // If getting faster and within reasonable time = confident
    if (recentAvgTime < avgTime && recentAvgTime < timeThreshold) {
      return 0.5; // Suggest harder
    }
    
    // If taking much longer = struggling
    if (recentAvgTime > timeThreshold * 1.5) {
      return -0.5; // Suggest easier
    }
    
    return 0; // Neutral
  }

  /**
   * Calculate answer consistency (how stable performance is)
   */
  private static calculateAnswerConsistency(answers: SubmissionAnswer[]): number {
    if (answers.length < 3) return 0;
    
    const windowSize = Math.min(5, answers.length);
    const windows: number[] = [];
    
    for (let i = 0; i <= answers.length - windowSize; i++) {
      const window = answers.slice(i, i + windowSize);
      const accuracy = window.filter(a => a.isCorrect).length / windowSize;
      windows.push(accuracy);
    }
    
    // Calculate variance (lower variance = more consistent)
    const mean = windows.reduce((sum, val) => sum + val, 0) / windows.length;
    const variance = windows.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / windows.length;
    
    // Convert to score (0-1, where 1 is very consistent)
    return Math.max(0, 1 - variance * 2);
  }

  /**
   * Calculate improvement trend from answer sequence (real-time)
   */
  private static calculateRealTimeImprovementTrend(answers: SubmissionAnswer[]): number {
    if (answers.length < 4) return 0;
    
    const half = Math.floor(answers.length / 2);
    const firstHalf = answers.slice(0, half);
    const secondHalf = answers.slice(half);
    
    const firstAccuracy = firstHalf.filter(a => a.isCorrect).length / firstHalf.length;
    const secondAccuracy = secondHalf.filter(a => a.isCorrect).length / secondHalf.length;
    
    // Return difference (-1 to 1)
    return secondAccuracy - firstAccuracy;
  }
}
