import type { Response } from 'express';
import { getGroqService } from '../services/groqService.js';
import { getGeminiService } from '../services/geminiService.js';
import { AdaptiveDifficultyService } from '../services/adaptiveDifficultyService.js';
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

    if (!baseParams) {
      throw new BadRequestError('Base parameters are required for adaptive generation');
    }

    if (!userPerformanceData) {
      throw new BadRequestError('User performance data is required for adaptive generation');
    }

    // Use sophisticated adaptive algorithm to determine difficulty distribution
    const adaptiveRecommendation = AdaptiveDifficultyService.calculateAdaptiveDifficulty(
      userPerformanceData,
      baseParams.subject,
      baseParams.difficulty
    );

    const adaptiveParams: QuizGenerationParams = {
      ...baseParams,
      difficulty: 'mixed' as const,
      adaptiveParams: {
        userPastPerformance: userPerformanceData,
        difficultyDistribution: adaptiveRecommendation.difficultyDistribution
      }
    };

    logger.info('Adaptive difficulty calculated:', {
      userId: req.userId,
      subject: baseParams.subject,
      distribution: adaptiveRecommendation.difficultyDistribution,
      confidence: adaptiveRecommendation.confidenceLevel,
      reasoning: adaptiveRecommendation.reasoning,
      factors: adaptiveRecommendation.adaptationFactors
    });

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

    // Log AI task with adaptive metadata
    try {
      const aiLog = new AILog({
        userId: req.userId,
        taskType: 'generation',
        inputData: { 
          ...adaptiveParams, 
          isAdaptive: true,
          adaptiveRecommendation: {
            distribution: adaptiveRecommendation.difficultyDistribution,
            confidence: adaptiveRecommendation.confidenceLevel,
            factors: adaptiveRecommendation.adaptationFactors
          }
        },
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

    logger.info('Adaptive questions generated successfully:', {
      userId: req.userId,
      questionsCount: questions?.length,
      model: aiModel,
      processingTime,
      distribution: adaptiveRecommendation.difficultyDistribution,
      confidence: adaptiveRecommendation.confidenceLevel
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
          adaptiveMetadata: {
            difficultyDistribution: adaptiveRecommendation.difficultyDistribution,
            reasoning: adaptiveRecommendation.reasoning,
            confidenceLevel: adaptiveRecommendation.confidenceLevel,
            suggestedTopics: adaptiveRecommendation.suggestedTopics,
            adaptationFactors: adaptiveRecommendation.adaptationFactors,
            isAdaptive: true
          }
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

export const adjustDifficultyRealTime = async (req: AuthRequest, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { 
      currentAnswers, 
      remainingQuestions, 
      currentDifficulty, 
      subject, 
      timeRemaining 
    } = req.body;

    // Enhanced real-time difficulty adjustment with multiple factors
    const adjustment = AdaptiveDifficultyService.adjustDifficultyRealTime(
      currentAnswers, 
      remainingQuestions
    );

    // Calculate performance metrics for this session
    const sessionMetrics = {
      correctPercentage: (currentAnswers.filter((a: any) => a.isCorrect).length / currentAnswers.length) * 100,
      averageTimePerQuestion: currentAnswers.reduce((sum: number, a: any) => sum + a.timeSpent, 0) / currentAnswers.length,
      hintsUsed: currentAnswers.reduce((sum: number, a: any) => sum + a.hintsUsed, 0),
      totalAnswered: currentAnswers.length
    };

    // Generate adaptive recommendations based on current performance
    let recommendedDifficulty = currentDifficulty;
    const recommendations: string[] = [];

    if (adjustment === 'harder') {
      if (currentDifficulty === 'easy') {
        recommendedDifficulty = 'medium';
      } else if (currentDifficulty === 'medium') {
        recommendedDifficulty = 'hard';
      }
      recommendations.push('Performance is strong - increasing difficulty to maintain engagement');
    } else if (adjustment === 'easier') {
      if (currentDifficulty === 'hard') {
        recommendedDifficulty = 'medium';
      } else if (currentDifficulty === 'medium') {
        recommendedDifficulty = 'easy';
      }
      recommendations.push('Adjusting difficulty to build confidence and maintain motivation');
    } else {
      recommendations.push('Current difficulty level is optimal for learning progression');
    }

    // Additional contextual recommendations
    if (sessionMetrics.averageTimePerQuestion > 120) { // 2 minutes per question
      recommendations.push('Consider allowing more time or reducing complexity');
    }

    if (sessionMetrics.hintsUsed > currentAnswers.length * 0.5) {
      recommendations.push('High hint usage detected - consider easier questions or better explanations');
    }

    const processingTime = Date.now() - startTime;

    // Log the adjustment decision
    try {
      const aiLog = new AILog({
        userId: req.userId,
        taskType: 'difficulty_adjustment',
        inputData: {
          currentAnswers: currentAnswers.length,
          remainingQuestions,
          currentDifficulty,
          subject
        },
        outputData: {
          adjustment,
          recommendedDifficulty,
          sessionMetrics,
          recommendations
        },
        model: 'internal',
        processingTime,
        success: true,
        error: null
      });
      await aiLog.save();
    } catch (logError) {
      logger.error('Failed to log difficulty adjustment:', logError);
    }

    res.status(200).json({
      success: true,
      data: {
        adjustment,
        currentDifficulty,
        recommendedDifficulty,
        sessionMetrics,
        recommendations,
        remainingQuestions,
        adaptationReason: adjustment === 'maintain' 
          ? 'Current difficulty is appropriate' 
          : `Performance indicates need to make questions ${adjustment}`
      },
      meta: {
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Log the failure
    try {
      const aiLog = new AILog({
        userId: req.userId,
        taskType: 'difficulty_adjustment',
        inputData: req.body,
        outputData: null,
        model: 'internal',
        processingTime,
        success: false,
        error: (error as Error).message
      });
      await aiLog.save();
    } catch (logError) {
      logger.error('Failed to log difficulty adjustment failure:', logError);
    }

    handleError(res, 'adjustDifficultyRealTime', error as Error);
  }
};
