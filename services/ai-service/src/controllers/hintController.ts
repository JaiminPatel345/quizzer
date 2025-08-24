import type { Response } from 'express';
import { getGroqService } from '../services/groqService.js';
import { getGeminiService } from '../services/geminiService.js';
import { AILog } from '../models/AILog.js';
import { handleError, BadRequestError, UnauthorizedError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest, QuizQuestion } from '../types/index.js';

export const generateHint = async (req: AuthRequest, res: Response): Promise<void> => {
  let aiModel: 'groq' | 'gemini' = 'groq';

  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { question }: { question: QuizQuestion } = req.body;

    if (!question || !question.questionId || !question.questionText) {
      throw new BadRequestError('Valid question object with questionId and questionText is required');
    }

    // AI hint generation
    let hints: string[];
    let success = false;
    let error: string | undefined;

    try {
      const groqService = getGroqService();
      const hint = await groqService.generateHint(question);
      hints = [hint]; // Convert to array for consistency
      aiModel = 'groq';
      success = true;
    } catch (groqErr) {
      logger.warn('Groq hint generation failed, trying Gemini:', groqErr);
      try {
        const geminiService = getGeminiService();
        const hint = await geminiService.generateHint(question);
        hints = [hint]; // Convert to array for consistency
        aiModel = 'gemini';
        success = true;
      } catch (geminiErr) {
        logger.error('Both AI services failed for hint generation:', { groqErr, geminiErr });
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
          questionId: question.questionId,
          questionType: question.questionType,
          difficulty: question.difficulty,
          topic: question.topic
        },
        outputData: { hints },
        model: aiModel,
        success,
        error
      });
      await aiLog.save();
    } catch (logErr) {
      logger.error('Failed to log AI task:', logErr);
    }

    logger.info('Hint generated successfully', {
      userId: req.userId,
      questionId: question.questionId,
      model: aiModel
    });

    res.status(200).json({
      success: true,
      message: 'Hints generated successfully',
      data: {
        hints,
        questionId: question.questionId,
        metadata: {
          model: aiModel
        }
      }
    });

  } catch (err) {
    // Log failure
    try {
      const aiLog = new AILog({
        userId: req.userId,
        taskType: 'hint',
        inputData: req.body,
        outputData: null,
        model: aiModel,
        success: false,
        error: (err as Error).message
      });
      await aiLog.save();
    } catch (logErr) {
      logger.error('Failed to log AI task failure:', logErr);
    }

    handleError(res, 'generateHint', err as Error);
  }
};
