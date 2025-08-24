import type {Response} from 'express';
import {Quiz} from '../models/Quiz.js';
import {
  BadRequestError, handleError, NotFoundError, UnauthorizedError,
} from '../utils/errorHandler.js';
import {logger} from '../utils/logger.js';
import type {AuthRequest, QuizQuestion} from '../types/index.js';
import {
  getAIServiceClient,
} from 'submission-service/dist/config/serviceClient.js';
import {sanitizeQuestionsForClient} from '../utils/helper.js';
import {
  getAnalyticsServiceClient, getSubmissionServiceClient,
} from '../config/serviceClient.js';
import {sendAnalyticsEmail} from '../utils/emailUtil.js';
import {SubmissionResponse} from '../types/submissionTypes.js';

export const createQuiz = async (
    req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const {
      title, description, metadata, questions, template, isPublic,
    } = req.body;

    // Validate question count matches metadata
    if (questions.length !== metadata.totalQuestions) {
      throw new BadRequestError(`Question count (${questions.length}) does not match metadata.totalQuestions (${metadata.totalQuestions})`);
    }

    // Create quiz
    const quiz = new Quiz({
      title,
      description,
      metadata,
      questions,
      template,
      createdBy: req.userId,
      isActive: true,
      isPublic: isPublic || false,
      version: 1,
    });

    await quiz.save();

    logger.info('Quiz created successfully:', {
      quizId: quiz._id,
      title: quiz.title,
      createdBy: req.userId,
      questionsCount: questions.length,
    });

    res.status(201).json({
      success: true, message: 'Quiz created successfully', data: {
        quiz: {
          _id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          metadata: quiz.metadata,
          questions: quiz.questions,
          template: quiz.template,
          createdBy: quiz.createdBy,
          isPublic: quiz.isPublic,
          isActive: quiz.isActive,
          version: quiz.version,
          createdAt: quiz.createdAt,
          updatedAt: quiz.updatedAt, // Additional metadata
          questionsCount: questions.length,
          aiGenerated: false,
        },
      },
    });

  } catch (error) {
    handleError(res, 'createQuiz', error as Error);
  }
};


export const getQuizzes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      grade,
      subject,
      difficulty,
      category,
      tags,
      isPublic,
      from,
      to,
      marks,
      completedDate,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const filter: any = { isActive: true };

    if (grade) filter['metadata.grade'] = parseInt(grade as string);
    if (subject) filter['metadata.subject'] = new RegExp(subject as string, 'i');
    if (difficulty) filter['metadata.difficulty'] = difficulty;
    if (category) filter['metadata.category'] = new RegExp(category as string, 'i');
    if (tags) {
      const tagArray = (tags as string).split(',').map(tag => tag.trim());
      filter['metadata.tags'] = { $in: tagArray };
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from as string);
      if (to) filter.createdAt.$lte = new Date(to as string);
    }

    if (marks) filter['metadata.marks'] = parseInt(marks as string);

    if (completedDate) {
      filter.completedDate = new Date(completedDate as string);
      // Note: If completedDate is stored in submissions, this may require a join or separate query
    }

    // Public/private filter
    if (typeof isPublic !== 'undefined') {
      filter.isPublic = isPublic === 'true';
    } else if (!req.user) {
      filter.isPublic = true;
    } else {
      filter.$or = [{ isPublic: true }, { createdBy: req.userId }];
    }

    // Sort and pagination
    const sortField = sortBy || 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortObj: any = {};
    sortObj[sortField as string] = sortDirection;

    const pageNumber = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Query
    const quizzes = await Quiz.find(filter)
    .select('-questions') // exclude questions for list view
        .sort(sortObj)
        .skip(skip)
        .limit(pageSize)
        .populate('createdBy', 'username')
        .lean();

    const total = await Quiz.countDocuments(filter);
    const totalPages = Math.ceil(total / pageSize);

    logger.info('Quizzes retrieved:', {
      count: quizzes.length,
      total,
      filter: JSON.stringify(filter)
    });

    res.status(200).json({
      success: true,
      message: 'Quizzes retrieved successfully',
      data: {
        quizzes: quizzes.map(quiz => ({
          ...quiz,
          questionsCount: quiz.metadata.totalQuestions
        })),
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalItems: total,
          itemsPerPage: pageSize,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1
        },
        appliedFilters: { from, to, marks, completedDate }
      }
    });

  } catch (error) {
    handleError(res, 'getQuizzes', error as Error);
  }
};


export const getQuizById = async (
    req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {quizId} = req.params;
    const {includeHints = false, includeAnswers = false} = req.query;

    const quiz = await Quiz.findById(quizId).populate('createdBy',
        'username email',
    ).lean();

    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    // Check access permissions
    if (!quiz.isPublic && (!req.user || quiz.createdBy._id.toString() !==
        req.userId?.toString())) {
      throw new UnauthorizedError('Access denied to this quiz');
    }

    // Check if user is owner/admin to see answers
    const isOwner = req.user && quiz.createdBy._id.toString() ===
        req.userId?.toString();
    const showAnswers = includeAnswers === 'true' && isOwner;

    // ... existing hint generation logic ...

    logger.info('Quiz retrieved:', {
      quizId: quiz._id,
      title: quiz.title,
      requestedBy: req.userId,
      includeHints,
      showAnswers,
    });

    // SECURITY: Sanitize questions based on permissions
    res.status(200).json({
      success: true, message: 'Quiz retrieved successfully', data: {
        quiz: {
          ...quiz,
          questions: sanitizeQuestionsForClient(quiz.questions, showAnswers), // ✅ CONDITIONAL SANITIZATION
          hintsGenerated: includeHints === 'true',
          hintsCount: includeHints === 'true'
              ? quiz.questions.reduce((sum: number, q: any) => sum +
                  (q.hints?.length || 0), 0)
              : 0,
        },
      },
    });

  } catch (error) {
    handleError(res, 'getQuizById', error as Error);
  }
};

export const updateQuiz = async (
    req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const {quizId} = req.params;
    const updates = req.body;

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    // Check ownership
    if (quiz.createdBy.toString() !== req.userId?.toString()) {
      throw new UnauthorizedError('You can only update your own quizzes');
    }

    // Update quiz
    Object.assign(quiz, updates);
    quiz.version += 1;
    await quiz.save();

    logger.info('Quiz updated:', {
      quizId: quiz._id, updatedBy: req.userId, updates: Object.keys(updates),
    });

    const {questions: _, ...quizResponse} = quiz.toObject();

    res.status(200).json({
      success: true, message: 'Quiz updated successfully', data: {
        quiz: {
          ...quizResponse, questionsCount: quiz.questions.length,
        },
      },
    });

  } catch (error) {
    handleError(res, 'updateQuiz', error as Error);
  }
};

export const deleteQuiz = async (
    req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const {quizId} = req.params;

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    // Check ownership
    if (quiz.createdBy.toString() !== req.userId?.toString()) {
      throw new UnauthorizedError('You can only delete your own quizzes');
    }

    // Soft delete - mark as inactive
    quiz.isActive = false;
    await quiz.save();

    logger.info('Quiz deleted (soft):', {
      quizId: quiz._id, deletedBy: req.userId,
    });

    res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully',
      data: {quizId: quiz._id},
    });

  } catch (error) {
    handleError(res, 'deleteQuiz', error as Error);
  }
};

export const duplicateQuiz = async (
    req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const {quizId} = req.params;
    const {title} = req.body;

    const originalQuiz = await Quiz.findById(quizId);

    if (!originalQuiz) {
      throw new NotFoundError('Quiz');
    }

    // Check access permissions
    if (!originalQuiz.isPublic && originalQuiz.createdBy.toString() !==
        req.userId?.toString()) {
      throw new UnauthorizedError('Access denied to this quiz');
    }

    // Create duplicate
    const {
      _id, createdAt, updatedAt, createdBy, ...quizData
    } = originalQuiz.toObject();

    const duplicatedQuiz = new Quiz({
      ...quizData,
      title: title || `${originalQuiz.title} (Copy)`,
      createdBy: req.userId,
      isPublic: false, // Duplicated quizzes are private by default
      version: 1,
    });

    await duplicatedQuiz.save();

    logger.info('Quiz duplicated:', {
      originalQuizId: originalQuiz._id,
      newQuizId: duplicatedQuiz._id,
      duplicatedBy: req.userId,
    });

    const {questions: _, ...quizResponse} = duplicatedQuiz.toObject();

    res.status(201).json({
      success: true, message: 'Quiz duplicated successfully', data: {
        quiz: {
          ...quizResponse, questionsCount: duplicatedQuiz.questions.length,
        },
      },
    });

  } catch (error) {
    handleError(res, 'duplicateQuiz', error as Error);
  }
};

export const updateQuestionHints = async (
    req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const {quizId, questionId} = req.params;
    const {hints} = req.body;

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    // Check ownership
    if (quiz.createdBy.toString() !== req.userId?.toString()) {
      throw new UnauthorizedError('You can only update your own quizzes');
    }

    // Find the question
    const questionIndex = quiz.questions.findIndex(q => q.questionId ===
        questionId);

    if (questionIndex === -1) {
      throw new NotFoundError('Question not found in quiz');
    }

    // Update hints
    if (quiz.questions[questionIndex]) {
      quiz.questions[questionIndex].hints = hints;
    }

    quiz.version += 1;
    await quiz.save();

    logger.info('Question hints updated:', {
      quizId: quiz._id,
      questionId,
      updatedBy: req.userId,
      hintsCount: hints.length,
    });

    res.status(200).json({
      success: true, message: 'Question hints updated successfully', data: {
        quizId: quiz._id, questionId, hints, version: quiz.version,
      },
    });

  } catch (error) {
    handleError(res, 'updateQuestionHints', error as Error);
  }
};

export const createAIGeneratedQuiz = async (
    req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const {
      title, description, generationParams, metadata, isPublic = false,
    } = req.body;

    //  endpoint based on adaptiveGeneration flag
    const endpoint = generationParams.adaptiveGeneration
        ? '/api/ai/generate/adaptive'
        : '/api/ai/generate/questions';

    const aiServiceClient = getAIServiceClient();
    const questionsResponse = await aiServiceClient.post<{
      success: boolean; data: { questions: QuizQuestion[]; metadata: any; };
    }>(endpoint, generationParams.adaptiveGeneration ? {
      baseParams: {
        grade: generationParams.grade,
        subject: generationParams.subject,
        totalQuestions: generationParams.totalQuestions,
        topics: generationParams.topics,
      }, userPerformanceData: generationParams.userPerformanceData,
    } : generationParams, {
      headers: {Authorization: req.headers.authorization as string},
    });

    if (!questionsResponse.success) {
      throw new Error('Failed to generate questions from AI service');
    }

    const questions = questionsResponse.data.questions;

    const quiz = new Quiz({
      title, description, metadata: {
        grade: generationParams.grade,
        subject: generationParams.subject,
        totalQuestions: questions.length,
        timeLimit: metadata?.timeLimit || 30,
        difficulty: generationParams.difficulty,
        tags: metadata?.tags || [],
        category: metadata?.category,
        isAdaptive: generationParams.adaptiveGeneration || false,
      }, questions, createdBy: req.userId, isPublic, isActive: true, version: 1,
    });

    await quiz.save();

    res.status(201).json({
      success: true,
      message: `${generationParams.adaptiveGeneration
          ? 'Adaptive'
          : 'AI-generated'} quiz created successfully`,
      data: {
        quiz: {
          _id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          metadata: quiz.metadata,
          questions: sanitizeQuestionsForClient(questions),
          createdBy: req.userId,
          isPublic: quiz.isPublic,
          isActive: quiz.isActive,
          version: quiz.version,
          createdAt: quiz.createdAt,
          updatedAt: quiz.updatedAt,
          questionsCount: questions.length,
          aiGenerated: true,
          isAdaptive: generationParams.adaptiveGeneration,
          aiModel: questionsResponse.data.metadata?.model,
        },
      },
    });

  } catch (error) {
    handleError(res, 'createAIGeneratedQuiz', error as Error);
  }
};

export const getQuizWithHints = async (
    req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {quizId} = req.params;
    const {includeHints = false} = req.query;

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    // If hints requested and don't exist, generate them
    if (includeHints && req.user) {
      const questionsNeedingHints = quiz.questions.filter(q => !q.hints ||
          q.hints.length === 0);

      if (questionsNeedingHints.length > 0) {
        try {
          const aiServiceClient = getAIServiceClient();

          // Generate hints for questions that need them
          for (const question of questionsNeedingHints) {
            try {
              const hintResponse = await aiServiceClient.post<{
                success: boolean; data: { hints: string[] };
              }>(`/api/ai/hint/generate/${quizId}/${question.questionId}`,
                  {count: 2},
                  {
                    headers: {Authorization: req.headers.authorization as string},
                  },
              );

              if (hintResponse.success) {
                // Update question with hints
                const questionIndex = quiz.questions.findIndex(q => q.questionId ===
                    question.questionId);
                if (quiz.questions[questionIndex]) {
                  quiz.questions[questionIndex].hints = hintResponse.data.hints;
                }
              }
            } catch (hintError) {
              logger.warn('Failed to generate hints for question:',
                  {questionId: question.questionId, error: hintError},
              );
            }
          }

          // Save updated quiz with hints
          quiz.version += 1;
          await quiz.save();
        } catch (error) {
          logger.error('Failed to generate hints:', error);
        }
      }
    }

    const {questions, ...quizWithoutQuestions} = quiz.toObject();
    const responseQuestions = questions.map(q => ({
      ...q, hints: includeHints ? q.hints : undefined,
    }));

    res.status(200).json({
      success: true, message: 'Quiz retrieved successfully', data: {
        quiz: {
          ...quizWithoutQuestions, questions: responseQuestions,
        },
      },
    });

  } catch (error) {
    handleError(res, 'getQuizWithHints', error as Error);
  }
};

export const generateHintForQuestion = async (
    req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const {quizId, questionId} = req.params;

    // Validate ObjectId format for quizId
    if (!quizId || !/^[0-9a-fA-F]{24}$/.test(quizId)) {
      throw new BadRequestError('Invalid quiz ID format');
    }

    if (!questionId || questionId.trim() === '') {
      throw new BadRequestError('Question ID is required');
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    const question = quiz.questions.find(q => q.questionId === questionId);
    if (!question) {
      throw new NotFoundError('Question not found in this quiz');
    }

    // Check if hints already exist
    if (question.hints && question.hints.length > 0) {
      res.status(200).json({
        success: true, message: 'Hints already exist for this question', data: {
          hints: question.hints, questionId, cached: true,
        },
      });
      return;
    }

    try {
      const aiServiceClient = getAIServiceClient();
      const hintResponse = await aiServiceClient.post<{
        success: boolean; data: { hints: string[] };
      }>('/api/ai/generate/hint', {
        question: {
          questionId: question.questionId,
          questionText: question.questionText,
          questionType: question.questionType,
          options: question.options,
          correctAnswer: question.correctAnswer, // AI service gets correct answer
          topic: question.topic,
          difficulty: question.difficulty,
        },
      }, {
        headers: {Authorization: req.headers.authorization as string},
      });

      if (!hintResponse.success || !hintResponse.data.hints) {
        throw new Error('Invalid response from AI service');
      }

      const hints = hintResponse.data.hints;

      // Validate hints array
      if (!Array.isArray(hints) || hints.length === 0) {
        throw new Error('AI service returned invalid hints format');
      }

      // Update question with hints in database
      const questionIndex = quiz.questions.findIndex(q => q.questionId ===
          questionId);
      if (quiz.questions[questionIndex]) {
        quiz.questions[questionIndex].hints = hints;
      }
      quiz.version += 1;
      await quiz.save();

      logger.info('Hints generated and stored:', {
        quizId, questionId, userId: req.userId, hintsCount: hints.length,
      });

      res.status(200).json({
        success: true, message: 'Hints generated successfully', data: {
          hints, questionId, cached: false, hintsCount: hints.length,
        },
      });

    } catch (aiError) {
      logger.error('AI service error for hint generation:', {
        error: aiError,
        quizId,
        questionId,
        userId: req.userId
      });
      throw new Error('Failed to generate hints. Please try again later.');
    }

  } catch (error) {
    handleError(res, 'generateHintForQuestion', error as Error);
  }
};

export const submitQuiz = async (
    req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const {quizId} = req.params;
    const {
      answers,
      startedAt,
      submittedAt,
      requestEvaluation = true,
      sendAnalyticsToEmail = false,
    } = req.body;

    // Call submission service
    const submissionServiceClient = getSubmissionServiceClient();
    const submissionResponse = await submissionServiceClient.post<SubmissionResponse>(
        '/api/submission/submit',
        {
          quizId, answers, startedAt, submittedAt, requestEvaluation,
        },
        {
          headers: {Authorization: req.headers.authorization as string},
        },
    );

    if (!submissionResponse.success) {
      throw new Error('Failed to submit quiz to submission service');
    }

    const submissionData = submissionResponse.data;

    // Update analytics
    try {
      const analyticsServiceClient = getAnalyticsServiceClient();
      await analyticsServiceClient.post('/api/analytics/performance/update', {
        subject: submissionData.quiz.metadata.subject,
        grade: submissionData.quiz.metadata.grade,
        submissionData: {
          quizId: submissionData.submission.quizId,
          scoring: submissionData.submission.scoring,
          timing: submissionData.submission.timing,
          answers: submissionData.submission.answers,
        },
      }, {
        headers: {Authorization: req.headers.authorization as string},
      });
    } catch (analyticsError) {
      logger.warn('Analytics update failed:', analyticsError);
    }

    // Send email if requested
    if (sendAnalyticsToEmail && req.user.email) {
      try {
        await sendAnalyticsEmail(req.user.email, {
          username: req.user.username,
          quizTitle: submissionData.quiz.title,
          score: submissionData.submission.scoring.scorePercentage,
          grade: submissionData.submission.scoring.grade,
          suggestions: submissionData.results.suggestions,
          strengths: submissionData.results.strengths,
          weaknesses: submissionData.results.weaknesses,
        });
      } catch (emailError) {
        logger.warn('Failed to send analytics email:', emailError);
      }
    }

    res.status(201).json({
      success: true, message: 'Quiz submitted successfully', data: {
        ...submissionData, emailSent: sendAnalyticsToEmail,
      },
    });

  } catch (error) {
    handleError(res, 'submitQuiz', error as Error);
  }
};
