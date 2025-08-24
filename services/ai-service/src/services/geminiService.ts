import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import { QuestionTypeNormalizer, ValidQuestionType } from '../utils/questionTypeUtils.js';
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
      this.model = this.client.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });

      console.log('✅ Gemini client initialized');
      logger.info('Gemini client initialized successfully');
      this.initialized = true;

    } catch (error) {
      console.error('❌ Failed to initialize Gemini client:', error);
      logger.error('Failed to initialize Gemini client:', error);
      throw error;
    }
  }

  private parseAIResponse(content: string): QuizQuestion[] {
    try {
      // Remove markdown code blocks completely
      let cleaned = content.replace(/``````\s*$/g, '');
      cleaned = cleaned.trim();

      // Find JSON start
      const jsonStart = Math.min(
          cleaned.indexOf('[') !== -1 ? cleaned.indexOf('[') : cleaned.length,
          cleaned.indexOf('{') !== -1 ? cleaned.indexOf('{') : cleaned.length
      );

      if (jsonStart < cleaned.length) {
        cleaned = cleaned.substring(jsonStart);
      }

      // Find JSON end
      const lastBracket = cleaned.lastIndexOf(']');
      const lastBrace = cleaned.lastIndexOf('}');
      const jsonEnd = Math.max(lastBracket, lastBrace);

      if (jsonEnd !== -1) {
        cleaned = cleaned.substring(0, jsonEnd + 1);
      }

      const parsed = JSON.parse(cleaned);

      // Handle different response formats
      let rawQuestions: any[] = [];
      if (Array.isArray(parsed)) {
        rawQuestions = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        rawQuestions = parsed.questions;
      } else if (typeof parsed === 'object') {
        const possibleArrays = ['questions', 'data', 'items', 'quiz'];
        for (const key of possibleArrays) {
          if (parsed[key] && Array.isArray(parsed[key])) {
            rawQuestions = parsed[key];
            break;
          }
        }
        if (rawQuestions.length === 0) {
          throw new Error('Response object does not contain a questions array');
        }
      }

      if (rawQuestions.length === 0) {
        throw new Error('Unexpected response format');
      }

      // Normalize question types and return as QuizQuestion[]
      return QuestionTypeNormalizer.validateAndNormalizeQuestions(rawQuestions) as QuizQuestion[];

    } catch (error) {
      logger.error('Failed to parse Gemini response:', {
        error: (error as Error).message,
        contentPreview: content.substring(0, 200)
      });
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

      if (!content) {
        throw new Error('No content received from Gemini');
      }

      const questions = this.parseAIResponse(content);

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

      return hint.trim();

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

      // Clean and parse JSON
      let cleaned = content.replace(/``````\s*$/g, '').trim();
      const evaluation = JSON.parse(cleaned);

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
        difficultyInstruction = `Mix difficulty levels: ${params.adaptiveParams.difficultyDistribution.easy}% easy, ${params.adaptiveParams.difficultyDistribution.medium}% medium, ${params.adaptiveParams.difficultyDistribution.hard}% hard`;
      } else {
        difficultyInstruction = 'Mix difficulty: 30% easy, 50% medium, 20% hard';
      }
    } else {
      difficultyInstruction = `All questions should be ${params.difficulty} level`;
    }

    const topics = params.topics?.join(', ') || 'curriculum-appropriate topics';
    const subject = params.subject;
    const grade = params.grade;

    return `Generate exactly ${params.totalQuestions} UNIQUE and DIVERSE quiz questions for Grade ${grade} ${subject}.

STRICT REQUIREMENTS:
- ${difficultyInstruction}
- Question types MUST be EXACTLY: "mcq", "true_false", or "short_answer" (use these exact strings only)
- Create ORIGINAL questions - DO NOT use the example questions shown below
- Cover diverse topics: ${topics}
- Each question must test different concepts and knowledge areas
- Vary the complexity and phrasing to avoid repetitive patterns

QUESTION TYPE RULES:
- "mcq": Multiple choice with 4 options array
- "true_false": Boolean question, correctAnswer must be "true" or "false"
- "short_answer": Open-ended, no options array needed

CRITICAL: Return ONLY a JSON array starting with [ and ending with ]. No markdown, no explanations, no wrapper objects.

FORMAT REFERENCE (DO NOT COPY THESE QUESTIONS - THEY ARE JUST FORMAT EXAMPLES):
[
  {
    "questionId": "q1",
    "questionText": "Example MCQ question here",
    "questionType": "mcq",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Explanation here",
    "difficulty": "easy",
    "points": 1,
    "topic": "Topic Name"
  },
  {
    "questionId": "q2", 
    "questionText": "Example true/false statement here",
    "questionType": "true_false",
    "correctAnswer": "true",
    "explanation": "Explanation here",
    "difficulty": "medium",
    "points": 1,
    "topic": "Topic Name"
  },
  {
    "questionId": "q3",
    "questionText": "Example short answer question here",
    "questionType": "short_answer", 
    "correctAnswer": "Expected answer here",
    "explanation": "Explanation here",
    "difficulty": "hard",
    "points": 2,
    "topic": "Topic Name"
  }
]

Generate ${params.totalQuestions} ORIGINAL questions now:`;
  }

  private buildEvaluationPrompt(questions: QuizQuestion[], answers: SubmissionAnswer[]): string {
    return `Analyze this quiz performance and provide feedback:

Quiz Results:
- Total Questions: ${questions.length}
- Correct Answers: ${answers.filter(a => a.isCorrect).length}
- Wrong Answers: ${answers.filter(a => !a.isCorrect).length}

Return ONLY this JSON structure without markdown:
{
  "suggestions": ["specific tip 1", "specific tip 2"],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"]
}`;
  }
}

let geminiServiceInstance: GeminiService | null = null;

export const getGeminiService = (): GeminiService => {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiService();
  }
  return geminiServiceInstance;
};