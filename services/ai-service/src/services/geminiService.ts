import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import type { QuizQuestion, QuizGenerationParams, SubmissionAnswer, EvaluationResult } from '../types/index.js';

class GeminiService {
  private client: GoogleGenerativeAI | null = null;
  private model: any = null;
  private initialized: boolean = false;

  private initializeClient(): void {
    if (this.initialized) return;

    try {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY environment variable is required');
      }

      this.client = new GoogleGenerativeAI(geminiApiKey);
      this.model = this.client.getGenerativeModel({ model: 'gemini-pro' });

      console.log('✅ Gemini client initialized');
      logger.info('Gemini client initialized successfully');
      this.initialized = true;

    } catch (error) {
      console.error('❌ Failed to initialize Gemini client:', error);
      logger.error('Failed to initialize Gemini client:', error);
      throw error;
    }
  }

  async generateQuestions(params: QuizGenerationParams): Promise<QuizQuestion[]> {
    this.initializeClient();

    if (!this.model) {
      throw new Error('Gemini model not available');
    }

    const prompt = this.buildQuizPrompt(params);
    const startTime = Date.now();

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      const processingTime = Date.now() - startTime;

      // Clean up response (remove markdown formatting if present)
      const cleanContent = content.replace(/``````/g, '').trim();
      const questions = JSON.parse(cleanContent);

      logger.info('Questions generated successfully with Gemini', {
        questionsCount: questions.length,
        processingTime
      });

      return questions;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Gemini question generation failed:', {
        error: (error as Error).message,
        processingTime
      });
      throw error;
    }
  }

  async generateHint(question: QuizQuestion): Promise<string> {
    this.initializeClient();

    if (!this.model) {
      throw new Error('Gemini model not available');
    }

    const prompt = `Generate a helpful hint for this question without revealing the answer:
    
    Question: ${question.questionText}
    Type: ${question.questionType}
    Difficulty: ${question.difficulty}
    Topic: ${question.topic}
    
    Provide a subtle hint that guides the student towards the answer without giving it away directly.`;

    const startTime = Date.now();

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const hint = response.text();
      const processingTime = Date.now() - startTime;

      logger.info('Hint generated successfully with Gemini', {
        processingTime
      });

      return hint;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Gemini hint generation failed:', {
        error: (error as Error).message,
        processingTime
      });
      throw error;
    }
  }

  async evaluateSubmission(questions: QuizQuestion[], answers: SubmissionAnswer[]): Promise<EvaluationResult> {
    this.initializeClient();

    if (!this.model) {
      throw new Error('Gemini model not available');
    }

    const prompt = this.buildEvaluationPrompt(questions, answers);
    const startTime = Date.now();

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      const processingTime = Date.now() - startTime;

      const cleanContent = content.replace(/``````/g, '').trim();
      const evaluation = JSON.parse(cleanContent);

      logger.info('Evaluation completed successfully with Gemini', {
        processingTime
      });

      return evaluation;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Gemini evaluation failed:', {
        error: (error as Error).message,
        processingTime
      });
      throw error;
    }
  }

  private buildQuizPrompt(params: QuizGenerationParams): string {
    let difficultyInstruction = '';

    if (params.difficulty === 'mixed') {
      if (params.adaptiveParams?.difficultyDistribution) {
        difficultyInstruction = `Mix difficulty levels based on user performance: ${JSON.stringify(params.adaptiveParams.difficultyDistribution)}`;
      } else {
        difficultyInstruction = 'Mix difficulty: 30% easy, 50% medium, 20% hard';
      }
    } else {
      difficultyInstruction = `All questions should be ${params.difficulty} level`;
    }

    return `Generate ${params.totalQuestions} quiz questions for Grade ${params.grade} ${params.subject}.

Requirements:
- ${difficultyInstruction}
- Provide exactly ${params.totalQuestions} questions
- Include a mix of question types: multiple choice, true/false, and short answer
- Each question must have a clear correct answer and explanation
- Generate 2-3 hints per question
- Topics to focus on: ${params.topics?.join(', ') || 'curriculum-appropriate topics'}

${params.adaptiveParams?.userPastPerformance ?
        `User's past performance: ${JSON.stringify(params.adaptiveParams.userPastPerformance)}. Adjust accordingly.` : ''}

Return ONLY a valid JSON array with this exact structure:
[
  {
    "questionId": "q1",
    "questionText": "Question text here",
    "questionType": "mcq|true_false|short_answer",
    "options": ["option1", "option2", "option3", "option4"],
    "correctAnswer": "correct answer",
    "explanation": "explanation text",
    "difficulty": "easy|medium|hard",
    "points": 1,
    "hints": ["hint1", "hint2"],
    "topic": "specific topic"
  }
]`;
  }

  private buildEvaluationPrompt(questions: QuizQuestion[], answers: SubmissionAnswer[]): string {
    const wrongAnswers = answers.filter(answer => !answer.isCorrect);

    const wrongQuestionDetails = wrongAnswers.map(answer => {
      const question = questions.find(q => q.questionId === answer.questionId);
      return {
        question: question?.questionText,
        topic: question?.topic,
        userAnswer: answer.userAnswer,
        correctAnswer: question?.correctAnswer,
        difficulty: question?.difficulty
      };
    });

    return `Analyze this quiz performance and provide feedback:

Quiz Results:
- Total Questions: ${questions.length}
- Correct Answers: ${answers.filter(a => a.isCorrect).length}
- Wrong Answers: ${wrongAnswers.length}

Wrong Answer Details:
${JSON.stringify(wrongQuestionDetails, null, 2)}

Provide exactly 2 specific improvement suggestions and identify strengths/weaknesses.

Return ONLY a valid JSON object with this structure:
{
  "suggestions": ["specific tip 1", "specific tip 2"],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"]
}`;
  }
}

// Lazy initialization
let geminiServiceInstance: GeminiService | null = null;

export const getGeminiService = (): GeminiService => {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiService();
  }
  return geminiServiceInstance;
};
