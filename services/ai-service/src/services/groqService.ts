import Groq from 'groq-sdk';
import { logger } from '../utils/logger.js';
import type { QuizQuestion, QuizGenerationParams, SubmissionAnswer, EvaluationResult } from '../types/index.js';

class GroqService {
  private client: Groq | null = null;
  private initialized: boolean = false;

  private initializeClient(): void {
    if (this.initialized) return;

    try {
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        throw new Error('GROQ_API_KEY environment variable is required');
      }

      this.client = new Groq({
        apiKey: groqApiKey,
      });

      console.log('✅ Groq client initialized');
      logger.info('Groq client initialized successfully');
      this.initialized = true;

    } catch (error) {
      console.error('❌ Failed to initialize Groq client:', error);
      logger.error('Failed to initialize Groq client:', error);
      throw error;
    }
  }

  async generateQuestions(params: QuizGenerationParams): Promise<QuizQuestion[]> {
    this.initializeClient();

    if (!this.client) {
      throw new Error('Groq client not available');
    }

    const prompt = this.buildQuizPrompt(params);
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert education content creator. Generate high-quality quiz questions in valid JSON format only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.1-70b-versatile',
        max_tokens: 4000,
        temperature: 0.7,
      });

      const processingTime = Date.now() - startTime;
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from Groq');
      }

      const questions = JSON.parse(content);

      logger.info('Questions generated successfully with Groq', {
        questionsCount: questions.length,
        processingTime
      });

      return questions;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Groq question generation failed:', {
        error: (error as Error).message,
        processingTime
      });
      throw error;
    }
  }

  async generateHint(question: QuizQuestion): Promise<string> {
    this.initializeClient();

    if (!this.client) {
      throw new Error('Groq client not available');
    }

    const prompt = `Generate a helpful hint for this question without revealing the answer:
    
    Question: ${question.questionText}
    Type: ${question.questionType}
    Difficulty: ${question.difficulty}
    Topic: ${question.topic}
    
    Provide a subtle hint that guides the student towards the answer without giving it away directly.`;

    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful educational assistant. Provide clear, concise hints.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.1-70b-versatile',
        max_tokens: 200,
        temperature: 0.7,
      });

      const processingTime = Date.now() - startTime;
      const hint = response.choices[0]?.message?.content || '';

      logger.info('Hint generated successfully with Groq', {
        processingTime
      });

      return hint;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Groq hint generation failed:', {
        error: (error as Error).message,
        processingTime
      });
      throw error;
    }
  }

  async evaluateSubmission(questions: QuizQuestion[], answers: SubmissionAnswer[]): Promise<EvaluationResult> {
    this.initializeClient();

    if (!this.client) {
      throw new Error('Groq client not available');
    }

    const prompt = this.buildEvaluationPrompt(questions, answers);
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational evaluator. Provide constructive feedback in valid JSON format only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.1-70b-versatile',
        max_tokens: 1000,
        temperature: 0.7,
      });

      const processingTime = Date.now() - startTime;
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from Groq');
      }

      const evaluation = JSON.parse(content);

      logger.info('Evaluation completed successfully with Groq', {
        processingTime
      });

      return evaluation;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Groq evaluation failed:', {
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
let groqServiceInstance: GroqService | null = null;

export const getGroqService = (): GroqService => {
  if (!groqServiceInstance) {
    groqServiceInstance = new GroqService();
  }
  return groqServiceInstance;
};
