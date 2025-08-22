import type { Response } from 'express';
import { Quiz, User, PerformanceHistory } from '../models/index.js';
import { aiService } from '../services/aiService.js';
import { cacheService } from '../services/cacheService.js';
import { handleError, NotFoundError, BadRequestError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest } from '../middleware/index.js';
import type { QuizQuestion } from '../types/index.js';

export const generateQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }

    const { grade, subject, difficulty, totalQuestions, timeLimit, topics } = req.body;
    const userId = req.user._id;

    // Check cache first
    const cacheKey = cacheService.generateQuizCacheKey(
        userId.toString(),
        grade,
        subject,
        difficulty
    );

    const cachedQuiz = await cacheService.get(cacheKey);
    if (cachedQuiz) {
      logger.info('Quiz served from cache:', { userId, cacheKey });
      res.status(200).json({
        success: true,
        message: 'Quiz generated successfully (cached)',
        data: cachedQuiz
      });
      return;
    }

    // Get user's past performance for adaptive difficulty
    const pastPerformance = await PerformanceHistory.findOne({
      userId,
      subject,
      grade
    }).lean();

    // Determine difficulty distribution for mixed difficulty
    let difficultyDistribution = { easy: 30, medium: 50, hard: 20 };

    if (difficulty === 'mixed' && pastPerformance) {
      const avgScore = pastPerformance.stats.averageScore;
      if (avgScore < 50) {
        difficultyDistribution = { easy: 60, medium: 30, hard: 10 };
      } else if (avgScore > 80) {
        difficultyDistribution = { easy: 10, medium: 40, hard: 50 };
      }
    }

    // Generate quiz using AI
    const { questions, model } = await aiService.generateQuiz({
      grade,
      subject,
      difficulty,
      totalQuestions,
      topics,
      adaptiveParams: {
        userPastPerformance: pastPerformance?.stats,
        difficultyDistribution
      }
    });

    // Create quiz in database
    const quiz = new Quiz({
      title: `Grade ${grade} ${subject} Quiz`,
      description: `A ${difficulty} level quiz with ${totalQuestions} questions`,
      metadata: {
        grade,
        subject,
        totalQuestions: questions.length,
        timeLimit,
        difficulty,
        tags: topics || []
      },
      questions,
      aiGeneration: {
        prompt: `Generate ${totalQuestions} questions for Grade ${grade} ${subject}`,
        model,
        generatedAt: new Date(),
        adaptiveParams: {
          userPastPerformance: pastPerformance?.stats || {},
          difficultyDistribution
        }
      },
      createdBy: userId,
      isActive: true,
      cacheKey
    });

    await quiz.save();

    // Cache the quiz
    const quizResponse = {
      quizId: quiz._id,
      title: quiz.title,
      description: quiz.description,
      metadata: quiz.metadata,
      questions: quiz.questions.map(q => ({
        questionId: q.questionId,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        difficulty: q.difficulty,
        points: q.points,
        topic: q.topic
        // Note: Don't include correctAnswer or explanation in response
      })),
      timeLimit: quiz.metadata.timeLimit,
      totalQuestions: quiz.questions.length
    };

    await cacheService.cacheQuizData(cacheKey, quizResponse);

    logger.info('Quiz generated successfully:', {
      userId,
      quizId: quiz._id,
      questionsCount: questions.length,
      model
    });

    res.status(201).json({
      success: true,
      message: 'Quiz generated successfully',
      data: quizResponse
    });

  } catch (error) {
    handleError(res, 'generateQuiz', error as Error);
  }
};

export const getQuizHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }

    const {
      grade,
      subject,
      minScore,
      maxScore,
      from,
      to,
      page,
      limit,
      sortBy,
      sortOrder
    } = req.query;

    const userId = req.user._id;

    // Build filter
    const filter: any = { userId };

    if (grade) filter['metadata.grade'] = parseInt(grade as string);
    if (subject) filter['metadata.subject'] = new RegExp(subject as string, 'i');

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

    // Check cache
    const cacheKey = cacheService.generateUserHistoryCacheKey(userId.toString(), filter);
    const cachedHistory = await cacheService.get(cacheKey);

    if (cachedHistory) {
      logger.info('Quiz history served from cache:', { userId, cacheKey });
      res.status(200).json({
        success: true,
        message: 'Quiz history retrieved successfully (cached)',
        data: cachedHistory
      });
      return;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const pageNumber = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Get submissions with quiz data
    const submissions = await User.aggregate([
      { $match: { _id: userId } },
      {
        $lookup: {
          from: 'submissions',
          localField: '_id',
          foreignField: 'userId',
          as: 'submissions'
        }
      },
      { $unwind: '$submissions' },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'submissions.quizId',
          foreignField: '_id',
          as: 'quiz'
        }
      },
      { $unwind: '$quiz' },
      {
        $addFields: {
          'submissions.metadata.grade': '$quiz.metadata.grade',
          'submissions.metadata.subject': '$quiz.metadata.subject'
        }
      },
      { $replaceRoot: { newRoot: '$submissions' } },
      { $match: filter },
      { $sort: sort },
      { $skip: skip },
      { $limit: pageSize },
      {
        $project: {
          quizId: 1,
          attemptNumber: 1,
          'scoring.scorePercentage': 1,
          'scoring.grade': 1,
          'scoring.totalQuestions': 1,
          'scoring.correctAnswers': 1,
          'timing.submittedAt': 1,
          'timing.totalTimeSpent': 1,
          'aiEvaluation.suggestions': 1,
          'metadata.grade': 1,
          'metadata.subject': 1,
          quizTitle: '$quiz.title'
        }
      }
    ]);

    // Get total count
    const totalCount = await User.aggregate([
      { $match: { _id: userId } },
      {
        $lookup: {
          from: 'submissions',
          localField: '_id',
          foreignField: 'userId',
          as: 'submissions'
        }
      },
      { $unwind: '$submissions' },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'submissions.quizId',
          foreignField: '_id',
          as: 'quiz'
        }
      },
      { $unwind: '$quiz' },
      {
        $addFields: {
          'submissions.metadata.grade': '$quiz.metadata.grade',
          'submissions.metadata.subject': '$quiz.metadata.subject'
        }
      },
      { $replaceRoot: { newRoot: '$submissions' } },
      { $match: filter },
      { $count: 'total' }
    ]);

    const total = totalCount[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    const response = {
      submissions,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalItems: total,
        itemsPerPage: pageSize,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1
      }
    };

    // Cache the response
    await cacheService.set(cacheKey, response, 300); // 5 minutes

    logger.info('Quiz history retrieved:', {
      userId,
      itemsCount: submissions.length,
      totalItems: total
    });

    res.status(200).json({
      success: true,
      message: 'Quiz history retrieved successfully',
      data: response
    });

  } catch (error) {
    handleError(res, 'getQuizHistory', error as Error);
  }
};

export const requestHint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }

    const { quizId, questionId } = req.body;

    // Find the quiz and question
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    const question = quiz.questions.find(q => q.questionId === questionId);
    if (!question) {
      throw new NotFoundError('Question not found');
    }

    // Generate hint using AI
    const { hint, model } = await aiService.generateHint(question);

    logger.info('Hint generated:', {
      userId: req.user._id,
      quizId,
      questionId,
      model
    });

    res.status(200).json({
      success: true,
      message: 'Hint generated successfully',
      data: {
        hint,
        questionId,
        model
      }
    });

  } catch (error) {
    handleError(res, 'requestHint', error as Error);
  }
};

export const retryQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }

    const { quizId } = req.params;
    const userId = req.user._id;

    // Find the quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    // Return quiz without answers for retry
    const quizResponse = {
      quizId: quiz._id,
      title: quiz.title,
      description: quiz.description,
      metadata: quiz.metadata,
      questions: quiz.questions.map(q => ({
        questionId: q.questionId,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        difficulty: q.difficulty,
        points: q.points,
        topic: q.topic
      })),
      timeLimit: quiz.metadata.timeLimit,
      totalQuestions: quiz.questions.length,
      isRetry: true
    };

    logger.info('Quiz retry initiated:', { userId, quizId });

    res.status(200).json({
      success: true,
      message: 'Quiz ready for retry',
      data: quizResponse
    });

  } catch (error) {
    handleError(res, 'retryQuiz', error as Error);
  }
};
