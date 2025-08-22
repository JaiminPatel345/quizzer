import type { Response } from 'express';
import { Quiz, Submission, User, PerformanceHistory } from '../models/index.js';
import { aiService } from '../services/aiService.js';
import { emailService } from '../services/emailService.js';
import { cacheService } from '../services/cacheService.js';
import { handleError, NotFoundError, BadRequestError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest } from '../middleware/index.js';
import type { SubmissionAnswer, SubmissionScoring, SubmissionTiming } from '../types/index.js';

export const submitQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }

    const { quizId, answers, startedAt, submittedAt, sendEmail } = req.body;
    const userId = req.user._id;

    // Find the quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    // Validate submission timing
    const startTime = new Date(startedAt);
    const endTime = new Date(submittedAt);
    const totalTimeSpent = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    if (totalTimeSpent < 0) {
      throw new BadRequestError('Invalid submission timing');
    }

    // Check for existing attempts
    const existingAttempts = await Submission.countDocuments({ userId, quizId });
    const attemptNumber = existingAttempts + 1;

    // Evaluate answers
    const evaluatedAnswers: SubmissionAnswer[] = [];
    let correctAnswers = 0;
    let totalPoints = 0;

    for (const userAnswer of answers) {
      const question = quiz.questions.find(q => q.questionId === userAnswer.questionId);
      if (!question) {
        throw new BadRequestError(`Question ${userAnswer.questionId} not found in quiz`);
      }

      const isCorrect = question.correctAnswer.toLowerCase().trim() ===
          userAnswer.userAnswer.toLowerCase().trim();

      const pointsEarned = isCorrect ? question.points : 0;

      if (isCorrect) correctAnswers++;
      totalPoints += pointsEarned;

      evaluatedAnswers.push({
        questionId: userAnswer.questionId,
        userAnswer: userAnswer.userAnswer,
        isCorrect,
        pointsEarned,
        timeSpent: userAnswer.timeSpent || 0,
        hintsUsed: userAnswer.hintsUsed || 0
      });
    }

    // Calculate score
    const maxPossiblePoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const scorePercentage = Math.round((totalPoints / maxPossiblePoints) * 100);

    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (scorePercentage >= 90) grade = 'A';
    else if (scorePercentage >= 80) grade = 'B';
    else if (scorePercentage >= 70) grade = 'C';
    else if (scorePercentage >= 60) grade = 'D';
    else grade = 'F';

    const scoring: SubmissionScoring = {
      totalQuestions: quiz.questions.length,
      correctAnswers,
      totalPoints,
      scorePercentage,
      grade
    };

    const timing: SubmissionTiming = {
      startedAt: startTime,
      submittedAt: endTime,
      totalTimeSpent
    };

    // Get AI evaluation
    const { evaluation, model } = await aiService.evaluateSubmission(quiz.questions, evaluatedAnswers);

    // Get device info
    const userAgent = req.get('User-Agent') || 'Unknown';
    const deviceType = /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'mobile' :
        /Tablet/.test(userAgent) ? 'tablet' : 'desktop';

    // Create submission
    const submission = new Submission({
      quizId,
      userId,
      attemptNumber,
      answers: evaluatedAnswers,
      scoring,
      timing,
      aiEvaluation: {
        model,
        suggestions: evaluation.suggestions,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        evaluatedAt: new Date()
      },
      metadata: {
        ipAddress: req.ip || 'Unknown',
        userAgent,
        deviceType
      },
      isCompleted: true
    });

    await submission.save();

    // Update user performance
    await updateUserPerformance(userId, quiz, scoring, timing);

    // Invalidate user cache
    await cacheService.invalidateUserCache(userId.toString());
    await cacheService.invalidateLeaderboardCache();

    // Send email if requested
    if (sendEmail && req.user.email) {
      emailService.sendQuizResultEmail(
          userId,
          req.user.email,
          {
            username: req.user.username,
            quizTitle: quiz.title,
            score: scorePercentage,
            totalQuestions: quiz.questions.length,
            suggestions: evaluation.suggestions,
            grade
          }
      ).catch(error => {
        logger.error('Email sending failed:', error);
      });
    }

    logger.info('Quiz submitted successfully:', {
      userId,
      quizId,
      submissionId: submission._id,
      score: scorePercentage,
      attemptNumber
    });

    res.status(201).json({
      success: true,
      message: 'Quiz submitted successfully',
      data: {
        submissionId: submission._id,
        score: scorePercentage,
        grade,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        totalTimeSpent,
        attemptNumber,
        suggestions: evaluation.suggestions,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses
      }
    });

  } catch (error) {
    handleError(res, 'submitQuiz', error as Error);
  }
};

const updateUserPerformance = async (
    userId: any,
    quiz: any,
    scoring: SubmissionScoring,
    timing: SubmissionTiming
): Promise<void> => {
  try {
    // Update overall user performance
    const user = await User.findById(userId);
    if (user) {
      const currentAvg = user.performance.averageScore;
      const currentTotal = user.performance.totalQuizzesTaken;

      const newTotal = currentTotal + 1;
      const newAvg = ((currentAvg * currentTotal) + scoring.scorePercentage) / newTotal;

      user.performance.totalQuizzesTaken = newTotal;
      user.performance.averageScore = Math.round(newAvg * 100) / 100;

      // Update strong/weak subjects
      if (scoring.scorePercentage >= 80) {
        if (!user.performance.strongSubjects.includes(quiz.metadata.subject)) {
          user.performance.strongSubjects.push(quiz.metadata.subject);
        }
        // Remove from weak subjects if present
        user.performance.weakSubjects = user.performance.weakSubjects.filter(
            s => s !== quiz.metadata.subject
        );
      } else if (scoring.scorePercentage < 60) {
        if (!user.performance.weakSubjects.includes(quiz.metadata.subject)) {
          user.performance.weakSubjects.push(quiz.metadata.subject);
        }
        // Remove from strong subjects if present
        user.performance.strongSubjects = user.performance.strongSubjects.filter(
            s => s !== quiz.metadata.subject
        );
      }

      await user.save();
    }

    // Update subject-specific performance history
    let performanceHistory = await PerformanceHistory.findOne({
      userId,
      subject: quiz.metadata.subject,
      grade: quiz.metadata.grade
    });

    if (!performanceHistory) {
      performanceHistory = new PerformanceHistory({
        userId,
        subject: quiz.metadata.subject,
        grade: quiz.metadata.grade,
        stats: {
          totalQuizzes: 0,
          averageScore: 0,
          bestScore: 0,
          worstScore: 100,
          totalTimeSpent: 0,
          consistency: 0
        },
        recentPerformance: [],
        trends: {
          improving: true,
          trendDirection: 'stable',
          recommendedDifficulty: 'medium'
        },
        topicWiseStats: [],
        lastCalculatedAt: new Date()
      });
    }

    // Update stats
    const stats = performanceHistory.stats;
    const currentAvg = stats.averageScore;
    const currentTotal = stats.totalQuizzes;

    stats.totalQuizzes = currentTotal + 1;
    stats.averageScore = ((currentAvg * currentTotal) + scoring.scorePercentage) / stats.totalQuizzes;
    stats.bestScore = Math.max(stats.bestScore, scoring.scorePercentage);
    stats.worstScore = Math.min(stats.worstScore, scoring.scorePercentage);
    stats.totalTimeSpent += Math.round(timing.totalTimeSpent / 60); // Convert to minutes

    // Update recent performance (keep last 10)
    performanceHistory.recentPerformance.unshift({
      date: new Date(),
      score: scoring.scorePercentage,
      quizId: quiz._id,
      difficulty: quiz.metadata.difficulty
    });

    if (performanceHistory.recentPerformance.length > 10) {
      performanceHistory.recentPerformance = performanceHistory.recentPerformance.slice(0, 10);
    }

    // Calculate trends
    if (performanceHistory.recentPerformance.length >= 3) {
      const recent = performanceHistory.recentPerformance.slice(0, 3);
      const avgRecent = recent.reduce((sum, p) => sum + p.score, 0) / recent.length;

      if (avgRecent > stats.averageScore + 5) {
        performanceHistory.trends.trendDirection = 'up';
        performanceHistory.trends.improving = true;
      } else if (avgRecent < stats.averageScore - 5) {
        performanceHistory.trends.trendDirection = 'down';
        performanceHistory.trends.improving = false;
      } else {
        performanceHistory.trends.trendDirection = 'stable';
      }

      // Adjust recommended difficulty
      if (avgRecent >= 85) {
        performanceHistory.trends.recommendedDifficulty = 'hard';
      } else if (avgRecent >= 70) {
        performanceHistory.trends.recommendedDifficulty = 'medium';
      } else {
        performanceHistory.trends.recommendedDifficulty = 'easy';
      }
    }

    performanceHistory.lastCalculatedAt = new Date();
    await performanceHistory.save();

  } catch (error) {
    logger.error('Failed to update user performance:', error);
  }
};
