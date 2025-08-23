import type { Response } from 'express';
import { getGroqService } from '../services/groqService.js';
import { getGeminiService } from '../services/geminiService.js';
import { AILog } from '../models/AILog.js';
import { handleError, BadRequestError, UnauthorizedError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest, QuizQuestion, SubmissionAnswer } from '../types/index.js';

export const evaluateSubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  const startTime = Date.now();
  let aiModel: 'groq' | 'gemini' = 'groq';

  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { questions, answers }: { questions: QuizQuestion[], answers: SubmissionAnswer[] } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new BadRequestError('Valid questions array is required');
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      throw new BadRequestError('Valid answers array is required');
    }

    // Try Groq first, fallback to Gemini
    let evaluation;
    let success = false;
    let error;

    try {
      const groqService = getGroqService();
      evaluation = await groqService.evaluateSubmission(questions, answers);
      aiModel = 'groq';
      success = true;
    } catch (groqError) {
      logger.warn('Groq evaluation failed, trying Gemini:', groqError);

      try {
        const geminiService = getGeminiService();
        evaluation = await geminiService.evaluateSubmission(questions, answers);
        aiModel = 'gemini';
        success = true;
      } catch (geminiError) {
        logger.error('Both AI services failed for evaluation:', { groqError, geminiError });
        error = 'All AI services failed';
        throw new Error('AI services unavailable. Please try again later.');
      }
    }

    const processingTime = Date.now() - startTime;

    // Log AI task
    try {
      const aiLog = new AILog({
        userId: req.userId,
        taskType: 'evaluation',
        inputData: {
          questionsCount: questions.length,
          answersCount: answers.length,
          correctAnswers: answers.filter(a => a.isCorrect).length
        },
        outputData: evaluation,
        model: aiModel,
        processingTime,
        success,
        error
      });
      await aiLog.save();
    } catch (logError) {
      logger.error('Failed to log AI task:', logError);
    }

    logger.info('Submission evaluated successfully:', {
      userId: req.userId,
      questionsCount: questions.length,
      model: aiModel,
      processingTime
    });

    res.status(200).json({
      success: true,
      message: 'Submission evaluated successfully',
      data: {
        evaluation,
        metadata: {
          model: aiModel,
          processingTime,
          questionsCount: questions.length,
          answersCount: answers.length
        }
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Log failed AI task
    try {
      const aiLog = new AILog({
        userId: req.userId,
        taskType: 'evaluation',
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

    handleError(res, 'evaluateSubmission', error as Error);
  }
};

export const getSuggestions = async (req: AuthRequest, res: Response): Promise<void> => {
  const startTime = Date.now();
  let aiModel: 'groq' | 'gemini' = 'groq';

  try {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const { performanceData, subject, grade } = req.body;

    if (!performanceData) {
      throw new BadRequestError('Performance data is required');
    }

    const prompt = `Based on this student's performance data, provide 2 specific improvement suggestions:

Performance Data:
- Subject: ${subject || 'General'}
- Grade: ${grade || 'Not specified'}
- Average Score: ${performanceData.averageScore}%
- Total Quizzes: ${performanceData.totalQuizzes}
- Strong Subjects: ${performanceData.strongSubjects?.join(', ') || 'None identified'}
- Weak Subjects: ${performanceData.weakSubjects?.join(', ') || 'None identified'}
- Recent Performance: ${JSON.stringify(performanceData.recentPerformance || [])}

Provide exactly 2 actionable improvement suggestions in JSON format:
{
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

    // Try Groq first, fallback to Gemini
    let suggestions;
    let success = false;
    let error;

    try {
      const groqService = getGroqService();
      // Use the text generation method with custom prompt
      const result = await groqService.generateHint({
        questionText: prompt,
        questionType: 'short_answer',
        difficulty: 'medium',
        topic: 'performance analysis'
      } as any);

      // Parse the result as JSON
      const parsed = JSON.parse(result);
      suggestions = parsed.suggestions;
      aiModel = 'groq';
      success = true;
    } catch (groqError) {
      logger.warn('Groq suggestions failed, trying Gemini:', groqError);

      try {
        const geminiService = getGeminiService();
        const result = await geminiService.generateHint({
          questionText: prompt,
          questionType: 'short_answer',
          difficulty: 'medium',
          topic: 'performance analysis'
        } as any);

        const parsed = JSON.parse(result);
        suggestions = parsed.suggestions;
        aiModel = 'gemini';
        success = true;
      } catch (geminiError) {
        logger.error('Both AI services failed for suggestions:', { groqError, geminiError });
        error = 'All AI services failed';
        throw new Error('AI services unavailable. Please try again later.');
      }
    }

    const processingTime = Date.now() - startTime;

    // Log AI task
    try {
      const aiLog = new AILog({
        userId: req.userId,
        taskType: 'evaluation',
        inputData: { performanceData, subject, grade, type: 'suggestions' },
        outputData: { suggestions },
        model: aiModel,
        processingTime,
        success,
        error
      });
      await aiLog.save();
    } catch (logError) {
      logger.error('Failed to log AI task:', logError);
    }

    logger.info('Suggestions generated successfully:', {
      userId: req.userId,
      model: aiModel,
      processingTime
    });

    res.status(200).json({
      success: true,
      message: 'Suggestions generated successfully',
      data: {
        suggestions,
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
        taskType: 'evaluation',
        inputData: { ...req.body, type: 'suggestions' },
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

    handleError(res, 'getSuggestions', error as Error);
  }
};
