import type { Response } from 'express';
import { getGroqService } from '../services/groqService.js';
import { getGeminiService } from '../services/geminiService.js';
import { AILog } from '../models/AILog.js';
import { handleError, BadRequestError, UnauthorizedError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest, QuizQuestion } from '../types/index.js';

export const generateHint = async (req: AuthRequest, res: Response): Promise<void> => {
  const startTime = Date.now();
  let aiModel: 'groq' | 'gemini' = 'groq';

  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { question }: { question: QuizQuestion } = req.body;

    if (!question || !question.questionText) {
      throw new BadRequestError('Valid question object is required');
    }

    // Try Groq first, fallback to Gemini
    let hint;
    let success = false;
    let error;

    try {
      const groqService = getGroqService();
      hint = await groqService.generateHint(question);
      aiModel = 'groq';
      success = true;
    } catch (groqError) {
      logger.warn('Groq hint generation failed, trying Gemini:', groqError);

      try {
        const geminiService = getGeminiService();
        hint = await geminiService.generateHint(question);
        aiModel = 'gemini';
        success = true;
      } catch (geminiError) {
        logger.error('Both AI services failed for hint generation:', { groqError, geminiError });
        error = 'All AI services failed';
        throw new Error('AI services unavailable. Please try again later.');
      }
    }

    const processingTime = Date.now() - startTime;

    // Log AI task
    try {
      const aiLog = new AILog({
        userId: req.userId,
        taskType: 'hint',
        inputData: {
          questionId: question.questionId,
          questionType: question.questionType,
          difficulty: question.difficulty,
          topic: question.topic
        },
        outputData: { hint },
        model: aiModel,
        processingTime,
        success,
        error
      });
      await aiLog.save();
    } catch (logError) {
      logger.error('Failed to log AI task:', logError);
    }

    logger.info('Hint generated successfully:', {
      userId: req.userId,
      questionId: question.questionId,
      model: aiModel,
      processingTime
    });

    res.status(200).json({
      success: true,
      message: 'Hint generated successfully',
      data: {
        hint,
        questionId: question.questionId,
        metadata: {
          model: aiModel,
          processingTime
        }
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Log failed AI task
    try {
      const aiLog = new AILog({
        userId: req.userId,
        taskType: 'hint',
        inputData: req.body,
        outputData: null,
        model: aiModel,
        processingTime,
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
