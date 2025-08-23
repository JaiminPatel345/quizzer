import Groq from 'groq-sdk';
import {logger} from '../utils/logger.js';
import type {
  EvaluationResult, QuizGenerationParams, QuizQuestion, SubmissionAnswer,
} from '../types/index.js';

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

  private getAvailableModel(): string {
    // Priority: .env file > current free models
    const envModel = process.env.GROQ_MODEL;
    if (envModel) {
      return envModel;
    }

    // Current free available models (updated Aug 2025)
    const freeModels = [
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'llama3-70b-8192',
      'mixtral-8x7b-32768',
    ];

    return freeModels[0] as string;
  }

  private parseAIResponse(content: string): QuizQuestion[] {
    try {
      // Remove markdown code blocks
      let cleaned = content.replace(/``````/g, '');
      cleaned = cleaned.trim();

      // Find JSON start
      const jsonStart = Math.min(cleaned.indexOf('[') !== -1 ? cleaned.indexOf(
              '[') : cleaned.length,
          cleaned.indexOf('{') !== -1 ? cleaned.indexOf('{') : cleaned.length,
      );

      if (jsonStart < cleaned.length) {
        cleaned = cleaned.substring(jsonStart);
      }

      // Parse JSON
      const parsed = JSON.parse(cleaned);

      // Handle different response formats
      if (Array.isArray(parsed)) {
        return parsed as QuizQuestion[];
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions as QuizQuestion[];
      } else if (typeof parsed === 'object') {
        // If it's an object, try to extract array from common keys
        const possibleArrays = ['questions', 'data', 'items', 'quiz'];
        for (const key of possibleArrays) {
          if (parsed[key] && Array.isArray(parsed[key])) {
            return parsed[key] as QuizQuestion[];
          }
        }
        throw new Error('Response object does not contain a questions array');
      }

      throw new Error('Unexpected response format');

    } catch (error) {
      logger.error('Failed to parse AI response:', {
        error: (error as Error).message,
        contentPreview: content.substring(0, 200),
      });
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
            content: 'You are an expert education content creator. You MUST respond with ONLY a valid JSON array of quiz questions. Do not include any explanatory text, markdown formatting, or wrapper objects. Return directly the JSON array starting with [ and ending with ].',
          }, {
            role: 'user', content: prompt,
          },
        ], model: this.getAvailableModel(), max_completion_tokens: 4000, // Correct parameter name
        temperature: 0.3,
      });

      const processingTime = Date.now() - startTime;
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from Groq');
      }

      const questions = this.parseAIResponse(content);

      logger.info('Questions generated successfully with Groq', {
        questionsCount: questions.length,
        processingTime,
        model: this.getAvailableModel(),
      });

      return questions;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Groq question generation failed:', {
        error: (error as Error).message,
        processingTime,
        model: this.getAvailableModel(),
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
            content: 'You are a helpful educational assistant. Provide clear, concise hints. Respond with just the hint text, no additional formatting.',
          }, {
            role: 'user', content: prompt,
          },
        ],
        model: this.getAvailableModel(),
        max_completion_tokens: 200,
        temperature: 0.7,
      });

      const processingTime = Date.now() - startTime;
      const hint = response.choices[0]?.message?.content || '';

      logger.info('Hint generated successfully with Groq', {
        processingTime, model: this.getAvailableModel(),
      });

      return hint.trim();

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Groq hint generation failed:', {
        error: (error as Error).message,
        processingTime,
        model: this.getAvailableModel(),
      });
      throw error;
    }
  }

  async evaluateSubmission(
      questions: QuizQuestion[],
      answers: SubmissionAnswer[],
  ): Promise<EvaluationResult> {
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
            content: 'You are an expert educational evaluator. You MUST respond with ONLY valid JSON format. Do not include any explanatory text, markdown, or other content. Return only the JSON object.',
          }, {
            role: 'user', content: prompt,
          },
        ],
        model: this.getAvailableModel(),
        max_completion_tokens: 1000,
        temperature: 0.3,
      });

      const processingTime = Date.now() - startTime;
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from Groq');
      }

      // Clean and parse JSON
      let cleaned = content.replace(/``````/g, '').trim();
      const evaluation = JSON.parse(cleaned);

      logger.info('Evaluation completed successfully with Groq', {
        processingTime, model: this.getAvailableModel(),
      });

      return evaluation;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Groq evaluation failed:', {
        error: (error as Error).message,
        processingTime,
        model: this.getAvailableModel(),
      });
      throw error;
    }
  }

  private buildQuizPrompt(params: QuizGenerationParams): string {
    let difficultyInstruction = '';

    if (params.difficulty === 'mixed') {
      if (params.adaptiveParams?.difficultyDistribution) {
        difficultyInstruction = `Mix difficulty levels: ${params.adaptiveParams.difficultyDistribution.easy}% easy, ${params.adaptiveParams.difficultyDistribution.medium}% medium, ${params.adaptiveParams.difficultyDistribution.hard}% hard`;
      } else {
        difficultyInstruction = 'Mix difficulty: 30% easy, 50% medium, 20% hard';
      }
    } else {
      difficultyInstruction = `All questions should be ${params.difficulty} level`;
    }

    return `Generate exactly ${params.totalQuestions} quiz questions for Grade ${params.grade} ${params.subject}.

Requirements:
- ${difficultyInstruction}
- Include a mix of question types: multiple choice, true/false, and short answer
- Each question must have a clear correct answer and explanation
- Topics to focus on: ${params.topics?.join(', ') || 'curriculum-appropriate topics'}

CRITICAL: Return ONLY a JSON array starting with [ and ending with ]. No markdown, no explanations, no wrapper objects.

Use this exact format (NO HINTS):
[
  {
    "questionId": "q1",
    "questionText": "What is the main purpose of Java?",
    "questionType": "mcq",
    "options": ["Web Development", "Mobile Apps", "Enterprise Applications", "All of the above"],
    "correctAnswer": "All of the above",
    "explanation": "Java is used for web, mobile, and enterprise development.",
    "difficulty": "easy",
    "points": 1,
    "topic": "Java Fundamentals"
  }
]`;
  }

  private buildEvaluationPrompt(
      questions: QuizQuestion[], answers: SubmissionAnswer[]): string {
    const wrongAnswers = answers.filter(answer => !answer.isCorrect);

    return `Analyze this quiz performance and provide feedback:

Quiz Results:
- Total Questions: ${questions.length}
- Correct Answers: ${answers.filter(a => a.isCorrect).length}
- Wrong Answers: ${wrongAnswers.length}

Provide exactly 2 specific improvement suggestions and identify strengths/weaknesses.

Return ONLY this JSON structure:
{
  "suggestions": ["specific tip 1", "specific tip 2"],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"]
}`;
  }
}

let groqServiceInstance: GroqService | null = null;

export const getGroqService = (): GroqService => {
  if (!groqServiceInstance) {
    groqServiceInstance = new GroqService();
  }
  return groqServiceInstance;
};
