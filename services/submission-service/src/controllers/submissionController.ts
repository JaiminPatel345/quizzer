import type { Response } from 'express';
import { Submission } from '../models/Submission.js';
import { ScoringService } from '../services/scoringService.js';
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

    // 1. Fetch quiz from quiz service
    const quizServiceClient = getQuizServiceClient();
    const quizResponse = await quizServiceClient.get<{
      success: boolean;
      data: { quiz: any };
    }>(`/api/quiz/${quizId}`, {
      headers: { Authorization: req.headers.authorization as string}
    });

    if (!quizResponse.success) {
      throw new NotFoundError('Quiz not found');
    }

    const quiz = quizResponse.data.quiz;

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
        deviceType
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
              processingTime: number;
            };
          };
        }>('/api/ai/evaluate/submission', {
          questions: quiz.questions,
          answers: evaluatedAnswers
        }, {
          headers: { Authorization: req.headers.authorization as string }
        });

        if (evaluationResponse.success) {
          aiEvaluationData = {
            model: evaluationResponse.data.metadata.model,
            suggestions: evaluationResponse.data.evaluation.suggestions,
            strengths: evaluationResponse.data.evaluation.strengths,
            weaknesses: evaluationResponse.data.evaluation.weaknesses,
            evaluatedAt: new Date(),
            // processingTime: evaluationResponse.data.metadata.processingTime
          };
          submission.aiEvaluation = aiEvaluationData;
        }
      } catch (aiError) {
        logger.warn('AI evaluation failed:', aiError);
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
      logger.warn('Analytics update failed:', analyticsError);
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

    if (minScore || maxScore) {
      filter['scoring.scorePercentage'] = {};
      if (minScore) filter['scoring.scorePercentage'].$gte = parseFloat(minScore as string);
      if (maxScore) filter['scoring.scorePercentage'].$lte = parseFloat(maxScore as string);
    }

    if (from || to) {
      filter['timing.submittedAt'] = {};
      if (from) filter['timing.submittedAt'].$gte = new Date(from as string);
      if (to) filter['timing.submittedAt'].$lte = new Date(to as string);
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
      total
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
    }>(`/api/quiz/${submission.quizId}`, {
      headers: { Authorization: req.headers.authorization as string }
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
