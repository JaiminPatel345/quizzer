import type { Response } from 'express';
import { Quiz } from '../models/Quiz.js';
import { handleError, NotFoundError, BadRequestError, UnauthorizedError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest } from '../types/index.js';

export const createQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { title, description, metadata, questions, template, isPublic } = req.body;

    // Validate question count matches metadata
    if (questions.length !== metadata.totalQuestions) {
      throw new BadRequestError(
          `Question count (${questions.length}) does not match metadata.totalQuestions (${metadata.totalQuestions})`
      );
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
      version: 1
    });

    await quiz.save();

    logger.info('Quiz created successfully:', {
      quizId: quiz._id,
      title: quiz.title,
      createdBy: req.userId,
      questionsCount: questions.length
    });

    const { questions: _, ...quizResponse } = quiz.toObject();

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data: {
        quiz: {
          ...quizResponse,
          questionsCount: questions.length
        }
      }
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
      page,
      limit,
      sortBy,
      sortOrder
    } = req.query;

    // Build filter
    const filter: any = { isActive: true };

    if (grade) filter['metadata.grade'] = parseInt(grade as string);
    if (subject) filter['metadata.subject'] = new RegExp(subject as string, 'i');
    if (difficulty) filter['metadata.difficulty'] = difficulty;
    if (category) filter['metadata.category'] = new RegExp(category as string, 'i');
    if (tags) {
      const tagArray = (tags as string).split(',').map(tag => tag.trim());
      filter['metadata.tags'] = { $in: tagArray };
    }

    // Public/private filter
    if (isPublic !== undefined) {
      filter.isPublic = isPublic === 'true';
    } else if (!req.user) {
      // If not authenticated, only show public quizzes
      filter.isPublic = true;
    } else {
      // If authenticated, show public quizzes + user's own quizzes
      filter.$or = [
        { isPublic: true },
        { createdBy: req.userId }
      ];
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const pageNumber = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Get quizzes (exclude questions from list view for performance)
    const quizzes = await Quiz.find(filter)
    .select('-questions')
    .sort(sort)
    .skip(skip)
    .limit(pageSize)
    .populate('createdBy', 'username')
    .lean();

    // Get total count
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
        }
      }
    });

  } catch (error) {
    handleError(res, 'getQuizzes', error as Error);
  }
};

export const getQuizById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId)
    .populate('createdBy', 'username email')
    .lean();

    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    // Check access permissions
    if (!quiz.isPublic && (!req.user || quiz.createdBy._id.toString() !== req.userId?.toString())) {
      throw new UnauthorizedError('Access denied to this quiz');
    }

    logger.info('Quiz retrieved:', {
      quizId: quiz._id,
      title: quiz.title,
      requestedBy: req.userId
    });

    res.status(200).json({
      success: true,
      message: 'Quiz retrieved successfully',
      data: { quiz }
    });

  } catch (error) {
    handleError(res, 'getQuizById', error as Error);
  }
};

export const updateQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { quizId } = req.params;
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
      quizId: quiz._id,
      updatedBy: req.userId,
      updates: Object.keys(updates)
    });

    const { questions: _, ...quizResponse } = quiz.toObject();

    res.status(200).json({
      success: true,
      message: 'Quiz updated successfully',
      data: {
        quiz: {
          ...quizResponse,
          questionsCount: quiz.questions.length
        }
      }
    });

  } catch (error) {
    handleError(res, 'updateQuiz', error as Error);
  }
};

export const deleteQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { quizId } = req.params;

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
      quizId: quiz._id,
      deletedBy: req.userId
    });

    res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully',
      data: { quizId: quiz._id }
    });

  } catch (error) {
    handleError(res, 'deleteQuiz', error as Error);
  }
};

export const duplicateQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { quizId } = req.params;
    const { title } = req.body;

    const originalQuiz = await Quiz.findById(quizId);

    if (!originalQuiz) {
      throw new NotFoundError('Quiz');
    }

    // Check access permissions
    if (!originalQuiz.isPublic && originalQuiz.createdBy.toString() !== req.userId?.toString()) {
      throw new UnauthorizedError('Access denied to this quiz');
    }

    // Create duplicate
    const { _id, createdAt, updatedAt, createdBy, ...quizData } = originalQuiz.toObject();

    const duplicatedQuiz = new Quiz({
      ...quizData,
      title: title || `${originalQuiz.title} (Copy)`,
      createdBy: req.userId,
      isPublic: false, // Duplicated quizzes are private by default
      version: 1
    });

    await duplicatedQuiz.save();

    logger.info('Quiz duplicated:', {
      originalQuizId: originalQuiz._id,
      newQuizId: duplicatedQuiz._id,
      duplicatedBy: req.userId
    });

    const { questions: _, ...quizResponse } = duplicatedQuiz.toObject();

    res.status(201).json({
      success: true,
      message: 'Quiz duplicated successfully',
      data: {
        quiz: {
          ...quizResponse,
          questionsCount: duplicatedQuiz.questions.length
        }
      }
    });

  } catch (error) {
    handleError(res, 'duplicateQuiz', error as Error);
  }
};
