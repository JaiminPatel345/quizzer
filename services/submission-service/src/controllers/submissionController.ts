import type { Response } from 'express';
import { Submission } from '../models/Submission.js';
import { ScoringService } from '../services/scoringService.js';
import { SubmissionAnalytics } from '../utils/submissionAnalytics.js';
import { getQuizServiceClient, getAIServiceClient, getAnalyticsServiceClient } from '../config/serviceClient.js';
import { handleError, NotFoundError, BadRequestError, UnauthorizedError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest, QuizQuestion, SubmissionScoring, SubmissionTiming } from '../types/index.js';

export const submitQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { quizId, answers, startedAt, submittedAt, requestEvaluation = true } = req.body;
    const userId = req.user._id;

    // Validate inputs
    if (!quizId || !/^[0-9a-fA-F]{24}$/.test(quizId)) {
      throw new BadRequestError('Invalid quiz ID format');
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      throw new BadRequestError('Answers array is required and must not be empty');
    }

    // 1. Fetch quiz from quiz service
    let quiz;
    try {
      const quizServiceClient = getQuizServiceClient();
      const quizResponse = await quizServiceClient.get<{
        success: boolean;
        data: { quiz: any };
      }>(`/api/quiz/${quizId}?internal=true`, {
        headers: { 
          Authorization: req.headers.authorization as string,
          'x-internal-service': 'true'
        }
      });

      if (!quizResponse.success || !quizResponse.data.quiz) {
        throw new NotFoundError('Quiz not found');
      }

      quiz = quizResponse.data.quiz;
    } catch (quizError) {
      logger.error('Failed to fetch quiz:', { quizId, error: quizError });
      throw new NotFoundError('Quiz not found or service unavailable');
    }

    // 2. Calculate scores using scoring service
    const evaluatedAnswers = ScoringService.calculateScore(quiz.questions, answers);
    const statistics = ScoringService.calculateStatistics(evaluatedAnswers);

    const scoring = {
      totalQuestions: statistics.totalQuestions,
      correctAnswers: statistics.correctAnswers,
      totalPoints: statistics.totalPoints,
      scorePercentage: statistics.scorePercentage,
      grade: statistics.grade
    };

    const timing = {
      startedAt: new Date(startedAt),
      submittedAt: new Date(submittedAt),
      totalTimeSpent: Math.floor((new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 1000)
    };

    // Check for existing attempts
    const existingAttempts = await Submission.countDocuments({ userId, quizId });
    const attemptNumber = existingAttempts + 1;

    // Get device info
    const userAgent = req.get('User-Agent') || 'Unknown';
    const deviceType = /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'mobile' :
        /Tablet/.test(userAgent) ? 'tablet' : 'desktop';

    // 3. Create submission
    const submission = new Submission({
      quizId,
      userId,
      attemptNumber,
      answers: evaluatedAnswers,
      scoring,
      timing,
      metadata: {
        ipAddress: req.ip || 'Unknown',
        userAgent,
        deviceType,
        grade: quiz.metadata?.grade,
        subject: quiz.metadata?.subject
      },
      isCompleted: true
    });

    // 4. Request AI evaluation
    let aiEvaluationData = null;
    if (requestEvaluation) {
      try {
        const aiServiceClient = getAIServiceClient();
        const evaluationResponse = await aiServiceClient.post<{
          success: boolean;
          data: {
            evaluation: {
              suggestions: string[];
              strengths: string[];
              weaknesses: string[];
            };
            metadata: {
              model: 'groq' | 'gemini';
              processingTime?: number;
            };
          };
        }>('/api/ai/evaluate/submission', {
          questions: quiz.questions,
          answers: evaluatedAnswers
        }, {
          headers: { Authorization: req.headers.authorization as string }
        });

        if (evaluationResponse.success && evaluationResponse.data?.evaluation) {
          aiEvaluationData = {
            model: evaluationResponse.data.metadata.model,
            suggestions: evaluationResponse.data.evaluation.suggestions || [],
            strengths: evaluationResponse.data.evaluation.strengths || [],
            weaknesses: evaluationResponse.data.evaluation.weaknesses || [],
            evaluatedAt: new Date(),
          };
          submission.aiEvaluation = aiEvaluationData;
        } else {
          logger.warn('AI evaluation response was invalid:', evaluationResponse);
        }
      } catch (aiError) {
        logger.warn('AI evaluation failed:', {
          error: aiError,
          quizId,
          userId
        });
      }
    }

    await submission.save();

    // 5. Update analytics service
    try {
      const analyticsServiceClient = getAnalyticsServiceClient();
      await analyticsServiceClient.post('/api/analytics/performance/update', {
        subject: quiz.metadata.subject,
        grade: quiz.metadata.grade,
        submissionData: {
          quizId: submission.quizId,
          scoring: submission.scoring,
          timing: submission.timing,
          answers: evaluatedAnswers,
          difficulty: quiz.metadata.difficulty
        }
      }, {
        headers: { Authorization: req.headers.authorization as string}
      });
    } catch (analyticsError) {
      logger.warn('Analytics update failed:', {
        message: (analyticsError as any)?.message || 'Unknown error',
        status: (analyticsError as any)?.response?.status,
        data: (analyticsError as any)?.response?.data
      });
    }

    logger.info('Quiz submitted with full integration:', {
      userId,
      quizId,
      submissionId: submission._id,
      score: scoring.scorePercentage,
      attemptNumber,
      aiEvaluated: !!aiEvaluationData
    });

    // FIXED: Return complete submission data with all context
    res.status(201).json({
      success: true,
      message: 'Quiz submitted successfully',
      data: {
        submission: {
          _id: submission._id,
          quizId: submission.quizId,
          userId: submission.userId,
          attemptNumber: submission.attemptNumber,
          scoring: submission.scoring,
          timing: submission.timing,
          aiEvaluation: aiEvaluationData,
          metadata: submission.metadata,
          isCompleted: submission.isCompleted,
          createdAt: submission.createdAt,
          updatedAt: submission.updatedAt
        },
        quiz: {
          _id: quiz._id,
          title: quiz.title,
          metadata: quiz.metadata
        },
        results: {
          score: scoring.scorePercentage,
          grade: scoring.grade,
          correctAnswers: scoring.correctAnswers,
          totalQuestions: scoring.totalQuestions,
          totalTimeSpent: timing.totalTimeSpent,
          suggestions: aiEvaluationData?.suggestions || [],
          strengths: aiEvaluationData?.strengths || [],
          weaknesses: aiEvaluationData?.weaknesses || [],
          aiModel: aiEvaluationData?.model || null,
        },
        analytics: {
          updated: true,
          message: 'Performance data updated automatically'
        }
      }
    });

  } catch (error) {
    handleError(res, 'submitQuiz', error as Error);
  }
};

export const getSubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { submissionId } = req.params;
    const userId = req.user._id;

    const submission = await Submission.findOne({
      _id: submissionId,
      userId
    }).lean();

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    logger.info('Submission retrieved:', {
      userId,
      submissionId: submission._id
    });

    res.status(200).json({
      success: true,
      message: 'Submission retrieved successfully',
      data: { submission }
    });

  } catch (error) {
    handleError(res, 'getSubmission', error as Error);
  }
};

export const getUserSubmissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const {
      quizId,
      grade,
      subject,
      minScore,
      maxScore,
      from,
      to,
      page = 1,
      limit = 10,
      sortBy = 'timing.submittedAt',
      sortOrder = 'desc'
    } = req.query;

    const userId = req.user._id;

    // Build filter
    const filter: any = { userId, isCompleted: true };

    if (quizId) filter.quizId = quizId;

    if (grade) filter['metadata.grade'] = parseInt(grade as string);

    if (subject) {
      filter['metadata.subject'] = { $regex: new RegExp(subject as string, 'i') };
    }

    if (minScore || maxScore) {
      filter['scoring.scorePercentage'] = {};
      if (minScore) filter['scoring.scorePercentage'].$gte = parseFloat(minScore as string);
      if (maxScore) filter['scoring.scorePercentage'].$lte = parseFloat(maxScore as string);
    }

    if (from || to) {
      filter['timing.submittedAt'] = {};
      if (from) {
        try {
          filter['timing.submittedAt'].$gte = new Date(from as string);
        } catch (dateError) {
          throw new BadRequestError('Invalid from date format');
        }
      }
      if (to) {
        try {
          filter['timing.submittedAt'].$lte = new Date(to as string);
        } catch (dateError) {
          throw new BadRequestError('Invalid to date format');
        }
      }
    }

    // Build sort
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const skip = (pageNumber - 1) * pageSize;

    // Get submissions
    const submissions = await Submission.find(filter)
    .select('-answers') // Exclude detailed answers for list view
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .lean();

    // Get total count
    const total = await Submission.countDocuments(filter);
    const totalPages = Math.ceil(total / pageSize);

    logger.info('User submissions retrieved:', {
      userId,
      count: submissions.length,
      total,
      filters: { quizId, grade, subject, minScore, maxScore, from, to }
    });

    res.status(200).json({
      success: true,
      message: 'Submissions retrieved successfully',
      data: {
        submissions,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalItems: total,
          itemsPerPage: pageSize,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1
        }
      }
    });

  } catch (error) {
    handleError(res, 'getUserSubmissions', error as Error);
  }
};

export const getSubmissionDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { submissionId } = req.params;
    const userId = req.user._id;

    const submission = await Submission.findOne({
      _id: submissionId,
      userId
    }).lean();

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    // Fetch quiz details from quiz service for explanations
    const quizServiceClient = getQuizServiceClient();
    const quizResponse = await quizServiceClient.get<{
      success: boolean;
      data: {
        quiz: {
          _id: string;
          title: string;
          questions: QuizQuestion[];
        };
      };
    }>(`/api/quiz/${submission.quizId}?internal=true`, {
      headers: { 
        Authorization: req.headers.authorization as string,
        'x-internal-service': 'true'
      }
    });

    let quizDetails = null;
    if (quizResponse.success) {
      quizDetails = {
        title: quizResponse.data.quiz.title,
        questions: quizResponse.data.quiz.questions.map(q => ({
          questionId: q.questionId,
          questionText: q.questionText,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          options: q.options
        }))
      };
    }

    const detailedSubmission = {
      ...submission,
      quiz: quizDetails
    };

    logger.info('Detailed submission retrieved:', {
      userId,
      submissionId: submission._id
    });

    res.status(200).json({
      success: true,
      message: 'Detailed submission retrieved successfully',
      data: { submission: detailedSubmission }
    });

  } catch (error) {
    handleError(res, 'getSubmissionDetails', error as Error);
  }
};

/**
 * Get all attempts for a specific quiz by a user
 */
export const getQuizAttempts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { quizId } = req.params;
    const userId = req.user._id;
    const { sortBy = 'attemptNumber', order = 'desc', includeDetails = false } = req.query;

    // Validate quiz ID
    if (!quizId || !/^[0-9a-fA-F]{24}$/.test(quizId)) {
      throw new BadRequestError('Invalid quiz ID format');
    }

    // Build sort criteria
    const sortCriteria: any = {};
    if (sortBy === 'score') {
      sortCriteria['scoring.scorePercentage'] = order === 'asc' ? 1 : -1;
    } else if (sortBy === 'date') {
      sortCriteria['timing.submittedAt'] = order === 'asc' ? 1 : -1;
    } else {
      sortCriteria['attemptNumber'] = order === 'asc' ? 1 : -1;
    }

    // Fetch all attempts for this quiz
    const attempts = await Submission.find({ 
      userId, 
      quizId,
      isCompleted: true 
    })
    .sort(sortCriteria)
    .lean();

    if (attempts.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No attempts found for this quiz',
        data: { 
          attempts: [],
          totalAttempts: 0,
          bestAttempt: null,
          latestAttempt: null
        }
      });
      return;
    }

    // Calculate statistics
    const bestAttempt = attempts.reduce((best, current) => 
      current.scoring.scorePercentage > best.scoring.scorePercentage ? current : best
    );

    const latestAttempt = attempts.reduce((latest, current) => 
      new Date(current.timing.submittedAt) > new Date(latest.timing.submittedAt) ? current : latest
    );

    // Get quiz details if requested
    let quizDetails = null;
    if (includeDetails === 'true') {
      try {
        const quizServiceClient = getQuizServiceClient();
        const quizResponse = await quizServiceClient.get(`/api/quiz/${quizId}?internal=true`, {
          headers: { 
            Authorization: req.headers.authorization as string,
            'x-internal-service': 'true'
          }
        });
        quizDetails = (quizResponse as any).data?.quiz || null;
      } catch (error) {
        logger.warn('Failed to fetch quiz details for attempts:', { quizId, error });
      }
    }

    // Calculate improvement metrics
    const scoreProgression = attempts
      .sort((a, b) => a.attemptNumber - b.attemptNumber)
      .map(attempt => ({
        attemptNumber: attempt.attemptNumber,
        score: attempt.scoring.scorePercentage,
        date: attempt.timing.submittedAt
      }));

    const improvementTrend = scoreProgression.length > 1 && scoreProgression[0] && scoreProgression[scoreProgression.length - 1]
      ? scoreProgression[scoreProgression.length - 1]!.score - scoreProgression[0]!.score
      : 0;

    logger.info('Quiz attempts retrieved:', {
      userId,
      quizId,
      totalAttempts: attempts.length,
      bestScore: bestAttempt.scoring.scorePercentage
    });

    res.status(200).json({
      success: true,
      message: 'Quiz attempts retrieved successfully',
      data: {
        attempts: attempts.map(attempt => ({
          ...attempt,
          _id: attempt._id,
          attemptNumber: attempt.attemptNumber,
          scoring: attempt.scoring,
          timing: attempt.timing,
          metadata: attempt.metadata,
          aiEvaluation: attempt.aiEvaluation || null
        })),
        totalAttempts: attempts.length,
        bestAttempt: {
          attemptNumber: bestAttempt.attemptNumber,
          score: bestAttempt.scoring.scorePercentage,
          grade: bestAttempt.scoring.grade,
          date: bestAttempt.timing.submittedAt
        },
        latestAttempt: {
          attemptNumber: latestAttempt.attemptNumber,
          score: latestAttempt.scoring.scorePercentage,
          grade: latestAttempt.scoring.grade,
          date: latestAttempt.timing.submittedAt
        },
        analytics: {
          scoreProgression,
          improvementTrend,
          averageScore: attempts.reduce((sum, attempt) => sum + attempt.scoring.scorePercentage, 0) / attempts.length,
          totalTimeSpent: attempts.reduce((sum, attempt) => sum + attempt.timing.totalTimeSpent, 0),
          consistencyScore: SubmissionAnalytics.calculateConsistencyScore(attempts)
        },
        quiz: quizDetails
      }
    });

  } catch (error) {
    handleError(res, 'getQuizAttempts', error as Error);
  }
};

/**
 * Retry a quiz - allows user to retake a quiz and re-evaluates scores
 */
export const retryQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { quizId } = req.params;
    const { answers, startedAt, submittedAt, requestEvaluation = true } = req.body;
    const userId = req.user._id;

    // Validate inputs
    if (!quizId || !/^[0-9a-fA-F]{24}$/.test(quizId)) {
      throw new BadRequestError('Invalid quiz ID format');
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      throw new BadRequestError('Answers array is required and must not be empty');
    }

    // Check if user has previous attempts
    const previousAttempts = await Submission.find({ 
      userId, 
      quizId, 
      isCompleted: true 
    }).sort({ attemptNumber: -1 });

    if (previousAttempts.length === 0) {
      throw new BadRequestError('No previous attempts found. Use regular submit endpoint for first attempt.');
    }

    const lastAttempt = previousAttempts[0];
    if (!lastAttempt) {
      throw new BadRequestError('Could not retrieve last attempt.');
    }

    const newAttemptNumber = lastAttempt.attemptNumber + 1;

    // Fetch quiz details
    let quiz;
    try {
      const quizServiceClient = getQuizServiceClient();
      const quizResponse = await quizServiceClient.get(`/api/quiz/${quizId}?internal=true`, {
        headers: { 
          Authorization: req.headers.authorization as string,
          'x-internal-service': 'true'
        }
      });

      if (!(quizResponse as any).data?.quiz) {
        throw new NotFoundError('Quiz not found');
      }

      quiz = (quizResponse as any).data.quiz;
    } catch (quizError) {
      logger.error('Failed to fetch quiz for retry:', { quizId, error: quizError });
      throw new NotFoundError('Quiz not found or service unavailable');
    }

    // Re-evaluate answers with current scoring logic
    const evaluatedAnswers = ScoringService.calculateScore(quiz.questions, answers);
    const statistics = ScoringService.calculateStatistics(evaluatedAnswers);

    const scoring = {
      totalQuestions: statistics.totalQuestions,
      correctAnswers: statistics.correctAnswers,
      totalPoints: statistics.totalPoints,
      scorePercentage: statistics.scorePercentage,
      grade: statistics.grade
    };

    const timing = {
      startedAt: new Date(startedAt),
      submittedAt: new Date(submittedAt),
      totalTimeSpent: Math.floor((new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 1000)
    };

    // Get device info
    const userAgent = req.get('User-Agent') || 'Unknown';
    const deviceType = /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'mobile' :
        /Tablet/.test(userAgent) ? 'tablet' : 'desktop';

    // Create new submission for retry
    const retrySubmission = new Submission({
      quizId,
      userId,
      attemptNumber: newAttemptNumber,
      answers: evaluatedAnswers,
      scoring,
      timing,
      metadata: {
        ipAddress: req.ip || 'Unknown',
        userAgent,
        deviceType,
        grade: quiz.metadata?.grade,
        subject: quiz.metadata?.subject,
        isRetry: true,
        previousAttempt: lastAttempt._id
      },
      isCompleted: true
    });

    // Request AI evaluation for retry
    let aiEvaluationData = null;
    if (requestEvaluation) {
      try {
        const aiServiceClient = getAIServiceClient();
        const evaluationResponse = await aiServiceClient.post('/evaluation/evaluate', {
          quizId,
          answers: evaluatedAnswers,
          totalScore: scoring.scorePercentage,
          subject: quiz.metadata?.subject || 'General',
          difficulty: quiz.metadata?.difficulty || 'medium',
          isRetry: true,
          previousScore: lastAttempt.scoring.scorePercentage
        }, {
          headers: { Authorization: req.headers.authorization as string }
        });

        if ((evaluationResponse as any).data?.success) {
          aiEvaluationData = (evaluationResponse as any).data.data.evaluation;
          retrySubmission.aiEvaluation = aiEvaluationData;
        }
      } catch (evaluationError) {
        logger.warn('AI evaluation failed for retry, continuing without it:', evaluationError);
      }
    }

    await retrySubmission.save();

    // Calculate improvement metrics
    const scoreImprovement = scoring.scorePercentage - lastAttempt.scoring.scorePercentage;
    const timeImprovement = lastAttempt.timing.totalTimeSpent - timing.totalTimeSpent;
    const gradeImprovement = SubmissionAnalytics.compareGrades(scoring.grade, lastAttempt.scoring.grade);

    // Send analytics data
    try {
      const analyticsServiceClient = getAnalyticsServiceClient();
      await analyticsServiceClient.post('/analytics/events', {
        eventType: 'quiz_retry',
        userId,
        quizId,
        data: {
          attemptNumber: newAttemptNumber,
          currentScore: scoring.scorePercentage,
          previousScore: lastAttempt.scoring.scorePercentage,
          scoreImprovement,
          timeImprovement,
          subject: quiz.metadata?.subject
        }
      }, {
        headers: { Authorization: req.headers.authorization as string }
      });
    } catch (analyticsError) {
      logger.warn('Failed to send retry analytics:', analyticsError);
    }

    logger.info('Quiz retry submitted successfully:', {
      userId,
      quizId,
      attemptNumber: newAttemptNumber,
      scoreImprovement,
      submissionId: retrySubmission._id
    });

    res.status(201).json({
      success: true,
      message: 'Quiz retry submitted successfully',
      data: {
        submission: {
          _id: retrySubmission._id,
          quizId: retrySubmission.quizId,
          attemptNumber: retrySubmission.attemptNumber,
          scoring: retrySubmission.scoring,
          timing: retrySubmission.timing,
          aiEvaluation: retrySubmission.aiEvaluation || null,
          metadata: retrySubmission.metadata
        },
        improvement: {
          scoreChange: scoreImprovement,
          timeChange: timeImprovement,
          gradeChange: gradeImprovement,
          isImprovement: scoreImprovement > 0
        },
        comparison: {
          previousAttempt: {
            attemptNumber: lastAttempt.attemptNumber,
            score: lastAttempt.scoring.scorePercentage,
            grade: lastAttempt.scoring.grade,
            date: lastAttempt.timing.submittedAt
          },
          currentAttempt: {
            attemptNumber: newAttemptNumber,
            score: scoring.scorePercentage,
            grade: scoring.grade,
            date: timing.submittedAt
          }
        }
      }
    });

  } catch (error) {
    handleError(res, 'retryQuiz', error as Error);
  }
};

/**
 * Get comparison between different attempts of the same quiz
 */
export const compareAttempts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { quizId } = req.params;
    const { attempt1, attempt2 } = req.query;
    const userId = req.user._id;

    // Validate inputs
    if (!quizId || !/^[0-9a-fA-F]{24}$/.test(quizId)) {
      throw new BadRequestError('Invalid quiz ID format');
    }

    if (!attempt1 || !attempt2) {
      throw new BadRequestError('Both attempt numbers are required');
    }

    // Fetch the specified attempts
    const [submission1, submission2] = await Promise.all([
      Submission.findOne({ 
        userId, 
        quizId, 
        attemptNumber: parseInt(attempt1 as string), 
        isCompleted: true 
      }).lean(),
      Submission.findOne({ 
        userId, 
        quizId, 
        attemptNumber: parseInt(attempt2 as string), 
        isCompleted: true 
      }).lean()
    ]);

    if (!submission1 || !submission2) {
      throw new NotFoundError('One or both attempts not found');
    }

    // Calculate comparison metrics
    const scoreComparison = {
      attempt1Score: submission1.scoring.scorePercentage,
      attempt2Score: submission2.scoring.scorePercentage,
      scoreDifference: submission2.scoring.scorePercentage - submission1.scoring.scorePercentage,
      improvement: submission2.scoring.scorePercentage > submission1.scoring.scorePercentage
    };

    const timeComparison = {
      attempt1Time: submission1.timing.totalTimeSpent,
      attempt2Time: submission2.timing.totalTimeSpent,
      timeDifference: submission2.timing.totalTimeSpent - submission1.timing.totalTimeSpent,
      fasterCompletion: submission2.timing.totalTimeSpent < submission1.timing.totalTimeSpent
    };

    // Question-by-question comparison
    const questionComparison = SubmissionAnalytics.compareQuestionAnswers(submission1.answers, submission2.answers);

    // Grade comparison
    const gradeComparison = {
      attempt1Grade: submission1.scoring.grade,
      attempt2Grade: submission2.scoring.grade,
      gradeImprovement: SubmissionAnalytics.compareGrades(submission2.scoring.grade, submission1.scoring.grade)
    };

    logger.info('Attempt comparison generated:', {
      userId,
      quizId,
      attempt1: attempt1,
      attempt2: attempt2
    });

    res.status(200).json({
      success: true,
      message: 'Attempt comparison retrieved successfully',
      data: {
        quizId,
        comparison: {
          score: scoreComparison,
          time: timeComparison,
          grade: gradeComparison,
          questions: questionComparison
        },
        attempts: {
          attempt1: {
            attemptNumber: submission1.attemptNumber,
            scoring: submission1.scoring,
            timing: submission1.timing,
            date: submission1.timing.submittedAt
          },
          attempt2: {
            attemptNumber: submission2.attemptNumber,
            scoring: submission2.scoring,
            timing: submission2.timing,
            date: submission2.timing.submittedAt
          }
        }
      }
    });

  } catch (error) {
    handleError(res, 'compareAttempts', error as Error);
  }
};

/**
 * Get best attempt for a quiz
 */
export const getBestAttempt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { quizId } = req.params;
    const userId = req.user._id;

    // Validate quiz ID
    if (!quizId || !/^[0-9a-fA-F]{24}$/.test(quizId)) {
      throw new BadRequestError('Invalid quiz ID format');
    }

    // Find best attempt by score
    const bestAttempt = await Submission.findOne({ 
      userId, 
      quizId,
      isCompleted: true 
    })
    .sort({ 'scoring.scorePercentage': -1, 'timing.submittedAt': -1 })
    .lean();

    if (!bestAttempt) {
      throw new NotFoundError('No attempts found for this quiz');
    }

    // Get total attempts count
    const totalAttempts = await Submission.countDocuments({ 
      userId, 
      quizId, 
      isCompleted: true 
    });

    logger.info('Best attempt retrieved:', {
      userId,
      quizId,
      bestScore: bestAttempt.scoring.scorePercentage,
      attemptNumber: bestAttempt.attemptNumber
    });

    res.status(200).json({
      success: true,
      message: 'Best attempt retrieved successfully',
      data: {
        bestAttempt: {
          _id: bestAttempt._id,
          attemptNumber: bestAttempt.attemptNumber,
          scoring: bestAttempt.scoring,
          timing: bestAttempt.timing,
          aiEvaluation: bestAttempt.aiEvaluation || null,
          metadata: bestAttempt.metadata
        },
        totalAttempts,
        isBestScore: true
      }
    });

  } catch (error) {
    handleError(res, 'getBestAttempt', error as Error);
  }
};
