import type { Response } from 'express';
import { getGroqService } from '../services/groqService.js';
import { getGeminiService } from '../services/geminiService.js';
import { AILog } from '../models/AILog.js';
import { handleError, BadRequestError, UnauthorizedError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest, QuizQuestion } from '../types/index.js';
import {getQuizServiceClient} from '../config/serviceClient.js';
import { NotFoundError } from '../utils/errorHandler.js';

export const generateHint = async (req: AuthRequest, res: Response): Promise<void> => {
  const startTime = Date.now();
  let aiModel: 'groq' | 'gemini' = 'groq';

  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { question } = req.body;
    const { questionId } = question;

    if (!questionId) {
      throw new BadRequestError('Question ID is required');
    }

    // Fetch full question details from Quiz service internally
    const quizServiceClient = getQuizServiceClient();
    let fullQuestion: QuizQuestion;

    try {
      // Find quiz containing this question
      const quizzesResponse = await quizServiceClient.get<{
        success: boolean;
        data: { quizzes: any[] };
      }>('/api/quiz?limit=100', {
        headers: { Authorization: req.headers.authorization as string }
      });

      if (!quizzesResponse.success) {
        throw new Error('Failed to fetch quizzes');
      }

      // Find the question across all quizzes
      let foundQuestion: QuizQuestion | null = null;
      for (const quiz of quizzesResponse.data.quizzes) {
        const quizDetail = await quizServiceClient.get<{
          success: boolean;
          data: { quiz: any };
        }>(`/api/quiz/${quiz._id}`, {
          headers: { Authorization: req.headers.authorization as string }
        });

        if (quizDetail.success) {
          foundQuestion = quizDetail.data.quiz.questions.find((q: any) => q.questionId === questionId);
          if (foundQuestion) break;
        }
      }

      if (!foundQuestion) {
        throw new NotFoundError('Question not found');
      }

      fullQuestion = foundQuestion;
    } catch (serviceError) {
      throw new Error('Failed to fetch question details from Quiz service');
    }

    // Generate hint using AI (without exposing correct answer)
    let hint;
    let success = false;
    let error;

    try {
      const groqService = getGroqService();
      hint = await groqService.generateHint(fullQuestion);
      aiModel = 'groq';
      success = true;
    } catch (groqError) {
      logger.warn('Groq hint generation failed, trying Gemini:', groqError);

      try {
        const geminiService = getGeminiService();
        hint = await geminiService.generateHint(fullQuestion);
        aiModel = 'gemini';
        success = true;
      } catch (geminiError) {
        logger.error('Both AI services failed for hint generation:', { groqError, geminiError });
        error = 'All AI services failed';
        throw new Error('AI services unavailable. Please try again later.');
      }
    }

    // Log AI task
    try {
      const aiLog = new AILog({
        userId: req.userId,
        taskType: 'hint',
        inputData: {
          questionId: fullQuestion.questionId,
          questionType: fullQuestion.questionType,
          difficulty: fullQuestion.difficulty,
          topic: fullQuestion.topic
        },
        outputData: { hint },
        model: aiModel,
        success,
        error
      });
      await aiLog.save();
    } catch (logError) {
      logger.error('Failed to log AI task:', logError);
    }

    logger.info('Hint generated successfully:', {
      userId: req.userId,
      questionId: fullQuestion.questionId,
      model: aiModel
    });

    res.status(200).json({
      success: true,
      message: 'Hint generated successfully',
      data: {
        hint,
        questionId: fullQuestion.questionId,
        metadata: {
          model: aiModel
        }
      }
    });

  } catch (error) {
    // Log failed AI task
    try {
      const aiLog = new AILog({
        userId: req.userId,
        taskType: 'hint',
        inputData: req.body,
        outputData: null,
        model: aiModel,
        success: false,
        error: (error as Error).message
      });
      await aiLog.save();
    } catch (logError) {
      logger.error('Failed to log AI task failure:', logError);
    }

    handleError(res, 'generateHint', error as Error);
  }
};
