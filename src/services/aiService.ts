import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import type { QuizQuestion, SubmissionAnswer } from '../types/index.js';

interface QuizGenerationParams {
  grade: number;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  totalQuestions: number;
  topics?: string[];
  adaptiveParams?: {
    userPastPerformance?: any;
    difficultyDistribution?: any;
  };
}

interface EvaluationResult {
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
}

class AIService {
  private groqClient: Groq | null = null;
  private geminiClient: GoogleGenerativeAI | null = null;
  private geminiModel: any | null = null;
  private initialized: boolean = false;

  constructor() {
    // Don't initialize here - do it lazily
  }

  private initializeClients(): void {
    if (this.initialized) return;

    try {
      console.log('🔧 Initializing AI services...');
      console.log('GROQ_API_KEY available:', !!process.env.GROQ_API_KEY);
      console.log('GEMINI_API_KEY available:', !!process.env.GEMINI_API_KEY);

      // Initialize Groq
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        console.warn('⚠️  GROQ_API_KEY not found, Groq client will be unavailable');
        logger.warn('GROQ_API_KEY not found, Groq client will be unavailable');
      } else {
        this.groqClient = new Groq({
          apiKey: groqApiKey,
        });
        console.log('✅ Groq client initialized');
        logger.info('✅ Groq client initialized');
      }

      // Initialize Gemini
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        console.warn('⚠️  GEMINI_API_KEY not found, Gemini client will be unavailable');
        logger.warn('GEMINI_API_KEY not found, Gemini client will be unavailable');
      } else {
        this.geminiClient = new GoogleGenerativeAI(geminiApiKey);
        this.geminiModel = this.geminiClient.getGenerativeModel({ model: 'gemini-pro' });
        console.log('✅ Gemini client initialized');
        logger.info('✅ Gemini client initialized');
      }

      // Check if at least one AI service is available
      if (!this.groqClient && !this.geminiClient) {
        throw new Error('No AI services available. Please provide GROQ_API_KEY and/or GEMINI_API_KEY in your .env file');
      }

      this.initialized = true;
      console.log('🤖 AI Services initialization complete');
      logger.info('🤖 AI Services initialization complete');

    } catch (error) {
      console.error('❌ Failed to initialize AI services:', error);
      logger.error('Failed to initialize AI services:', error);
      throw error;
    }
  }

  async generateQuiz(params: QuizGenerationParams): Promise<{ questions: QuizQuestion[], model: 'groq' | 'gemini' }> {
    // Initialize clients on first use
    this.initializeClients();

    const prompt = this.buildQuizPrompt(params);

    try {
      // Try Groq first if available
      if (this.groqClient) {
        const result = await this.generateWithGroq(prompt);
        return { questions: result, model: 'groq' };
      }
    } catch (error) {
      logger.warn('Groq failed, falling back to Gemini:', error);
    }

    try {
      // Fallback to Gemini if available
      if (this.geminiClient && this.geminiModel) {
        const result = await this.generateWithGemini(prompt);
        return { questions: result, model: 'gemini' };
      }
    } catch (geminiError) {
      logger.error('Both AI services failed:', { geminiError });
    }

    throw new Error('AI services unavailable. Please try again later.');
  }

  async generateHint(question: QuizQuestion): Promise<{ hint: string, model: 'groq' | 'gemini' }> {
    // Initialize clients on first use
    this.initializeClients();

    const prompt = `Generate a helpful hint for this question without revealing the answer:
    
    Question: ${question.questionText}
    Type: ${question.questionType}
    Difficulty: ${question.difficulty}
    Topic: ${question.topic}
    
    Provide a subtle hint that guides the student towards the answer without giving it away directly.`;

    try {
      if (this.groqClient) {
        const hint = await this.generateTextWithGroq(prompt);
        return { hint, model: 'groq' };
      }
    } catch (error) {
      logger.warn('Groq hint generation failed, using Gemini:', error);
    }

    if (this.geminiClient && this.geminiModel) {
      const hint = await this.generateTextWithGemini(prompt);
      return { hint, model: 'gemini' };
    }

    throw new Error('No AI services available for hint generation');
  }

  async evaluateSubmission(
      questions: QuizQuestion[],
      answers: SubmissionAnswer[]
  ): Promise<{ evaluation: EvaluationResult, model: 'groq' | 'gemini' }> {
    // Initialize clients on first use
    this.initializeClients();

    const prompt = this.buildEvaluationPrompt(questions, answers);

    try {
      if (this.groqClient) {
        const evaluation = await this.evaluateWithGroq(prompt);
        return { evaluation, model: 'groq' };
      }
    } catch (error) {
      logger.warn('Groq evaluation failed, using Gemini:', error);
    }

    if (this.geminiClient && this.geminiModel) {
      const evaluation = await this.evaluateWithGemini(prompt);
      return { evaluation, model: 'gemini' };
    }

    throw new Error('No AI services available for evaluation');
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

  private async generateWithGroq(prompt: string): Promise<QuizQuestion[]> {
    // Use non-null assertion since we know it's initialized at this point
    if (!this.groqClient) {
      throw new Error('Groq client not available');
    }

    const response = await this.groqClient.chat.completions.create({
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

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No content received from Groq');

    try {
      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to parse Groq response:', content);
      throw new Error('Invalid JSON response from Groq');
    }
  }

  private async generateWithGemini(prompt: string): Promise<QuizQuestion[]> {
    if (!this.geminiModel) {
      throw new Error('Gemini model not available');
    }

    const result = await this.geminiModel.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    try {
      // Clean up response (remove markdown formatting if present)
      const cleanContent = content.replace(/``````/g, '').trim();
      return JSON.parse(cleanContent);
    } catch (error) {
      logger.error('Failed to parse Gemini response:', content);
      throw new Error('Invalid JSON response from Gemini');
    }
  }

  private async generateTextWithGroq(prompt: string): Promise<string> {
    if (!this.groqClient) {
      throw new Error('Groq client not available');
    }

    const response = await this.groqClient.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful educational assistant. Provide clear, concise responses.'
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

    return response.choices[0]?.message?.content || '';
  }

  private async generateTextWithGemini(prompt: string): Promise<string> {
    if (!this.geminiModel) {
      throw new Error('Gemini model not available');
    }

    const result = await this.geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  private async evaluateWithGroq(prompt: string): Promise<EvaluationResult> {
    if (!this.groqClient) {
      throw new Error('Groq client not available');
    }

    const response = await this.groqClient.chat.completions.create({
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

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No content received from Groq');

    try {
      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to parse Groq evaluation:', content);
      throw new Error('Invalid JSON evaluation from Groq');
    }
  }

  private async evaluateWithGemini(prompt: string): Promise<EvaluationResult> {
    if (!this.geminiModel) {
      throw new Error('Gemini model not available');
    }

    const result = await this.geminiModel.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    try {
      const cleanContent = content.replace(/``````/g, '').trim();
      return JSON.parse(cleanContent);
    } catch (error) {
      logger.error('Failed to parse Gemini evaluation:', content);
      throw new Error('Invalid JSON evaluation from Gemini');
    }
  }
}

let aiServiceInstance: AIService | null = null;

export const aiService = {
  getInstance(): AIService {
    if (!aiServiceInstance) {
      aiServiceInstance = new AIService();
    }
    return aiServiceInstance;
  }
};

// For backward compatibility, also export the methods directly
export const getAIService = () => aiService.getInstance();
