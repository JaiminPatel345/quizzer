import type { Response } from 'express';
import { getGroqService } from '../services/groqService.js';
import { getGeminiService } from '../services/geminiService.js';
import { AILog } from '../models/AILog.js';
import { handleError, BadRequestError, UnauthorizedError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest, QuizGenerationParams } from '../types/index.js';

export const generateQuestions = async (req: AuthRequest, res: Response): Promise<void> => {
  const startTime = Date.now();
  let aiModel: 'groq' | 'gemini' = 'groq';

  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const params: QuizGenerationParams = req.body;

    // Try Groq first, fallback to Gemini
    let questions;
    let success = false;
    let error;

    try {
      const groqService = getGroqService();
      questions = await groqService.generateQuestions(params);
      aiModel = 'groq';
      success = true;
    } catch (groqError) {
      logger.warn('Groq generation failed, trying Gemini:', groqError);

      try {
        const geminiService = getGeminiService();
        questions = await geminiService.generateQuestions(params);
        aiModel = 'gemini';
        success = true;
      } catch (geminiError) {
        logger.error('Both AI services failed:', { groqError, geminiError });
        error = 'All AI services failed';
        throw new Error('AI services unavailable. Please try again later.');
      }
    }

    const processingTime = Date.now() - startTime;

    // Log AI task
    try {
      const aiLog = new AILog({
        userId: req.userId,
        taskType: 'generation',
        inputData: params,
        outputData: { questionsCount: questions?.length },
        model: aiModel,
        processingTime,
        success,
        error
      });
      await aiLog.save();
    } catch (logError) {
      logger.error('Failed to log AI task:', logError);
    }

    logger.info('Questions generated successfully:', {
      userId: req.userId,
      questionsCount: questions?.length,
      model: aiModel,
      processingTime
    });

    res.status(200).json({
      success: true,
      message: 'Questions generated successfully',
      data: {
        questions,
        metadata: {
          model: aiModel,
          processingTime,
          questionsCount: questions?.length
        }
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Log failed AI task
    try {
      const aiLog = new AILog({
        userId: req.userId,
        taskType: 'generation',
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

    handleError(res, 'generateQuestions', error as Error);
  }
};

export const generateAdaptiveQuestions = async (req: AuthRequest, res: Response): Promise<void> => {
  const startTime = Date.now();
  let aiModel: 'groq' | 'gemini' = 'groq';

  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { baseParams, userPerformanceData } = req.body;

    // Calculate adaptive difficulty distribution based on performance
    let difficultyDistribution = { easy: 30, medium: 50, hard: 20 };

    if (userPerformanceData?.averageScore !== undefined) {
      const avgScore = userPerformanceData.averageScore;
      if (avgScore < 50) {
        difficultyDistribution = { easy: 60, medium: 30, hard: 10 };
      } else if (avgScore > 80) {
        difficultyDistribution = { easy: 10, medium: 40, hard: 50 };
      } else if (avgScore > 65) {
        difficultyDistribution = { easy: 20, medium: 50, hard: 30 };
      }
    }

    const adaptiveParams: QuizGenerationParams = {
      ...baseParams,
      difficulty: 'mixed' as const,
      adaptiveParams: {
        userPastPerformance: userPerformanceData,
        difficultyDistribution
      }
    };

    // Try Groq first, fallback to Gemini
    let questions;
    let success = false;
    let error;

    try {
      const groqService = getGroqService();
      questions = await groqService.generateQuestions(adaptiveParams);
      aiModel = 'groq';
      success = true;
    } catch (groqError) {
      logger.warn('Groq adaptive generation failed, trying Gemini:', groqError);

      try {
        const geminiService = getGeminiService();
        questions = await geminiService.generateQuestions(adaptiveParams);
        aiModel = 'gemini';
        success = true;
      } catch (geminiError) {
        logger.error('Both AI services failed for adaptive generation:', { groqError, geminiError });
        error = 'All AI services failed';
        throw new Error('AI services unavailable. Please try again later.');
      }
    }

    const processingTime = Date.now() - startTime;

    // Log AI task
    try {
      const aiLog = new AILog({
        userId: req.userId,
        taskType: 'generation',
        inputData: { ...adaptiveParams, isAdaptive: true },
        outputData: {
          questionsCount: questions?.length,
          difficultyDistribution
        },
        model: aiModel,
        processingTime,
        success,
        error
      });
      await aiLog.save();
    } catch (logError) {
      logger.error('Failed to log AI task:', logError);
    }

    logger.info('Adaptive questions generated successfully:', {
      userId: req.userId,
      questionsCount: questions?.length,
      model: aiModel,
      processingTime,
      difficultyDistribution
    });

    res.status(200).json({
      success: true,
      message: 'Adaptive questions generated successfully',
      data: {
        questions,
        metadata: {
          model: aiModel,
          processingTime,
          questionsCount: questions?.length,
          difficultyDistribution,
          isAdaptive: true
        }
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Log failed AI task
    try {
      const aiLog = new AILog({
        userId: req.userId,
        taskType: 'generation',
        inputData: { ...req.body, isAdaptive: true },
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

    handleError(res, 'generateAdaptiveQuestions', error as Error);
  }
};
