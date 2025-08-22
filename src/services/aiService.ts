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
  private groqClient: Groq;
  private geminiClient: GoogleGenerativeAI;
  private geminiModel: any;

  constructor() {
    // Initialize Groq
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is required');
    }
    this.groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    // Initialize Gemini
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.geminiModel = this.geminiClient.getGenerativeModel({ model: 'gemini-pro' });
  }

  async generateQuiz(params: QuizGenerationParams): Promise<{ questions: QuizQuestion[], model: 'groq' | 'gemini' }> {
    const prompt = this.buildQuizPrompt(params);

    try {
      // Try Groq first
      const result = await this.generateWithGroq(prompt);
      return { questions: result, model: 'groq' };
    } catch (error) {
      logger.warn('Groq failed, falling back to Gemini:', error);

      try {
        // Fallback to Gemini
        const result = await this.generateWithGemini(prompt);
        return { questions: result, model: 'gemini' };
      } catch (geminiError) {
        logger.error('Both AI services failed:', { groqError: error, geminiError });
        throw new Error('AI services unavailable. Please try again later.');
      }
    }
  }

  async generateHint(question: QuizQuestion): Promise<{ hint: string, model: 'groq' | 'gemini' }> {
    const prompt = `Generate a helpful hint for this question without revealing the answer:
    
    Question: ${question.questionText}
    Type: ${question.questionType}
    Difficulty: ${question.difficulty}
    Topic: ${question.topic}
    
    Provide a subtle hint that guides the student towards the answer without giving it away directly.`;

    try {
      const hint = await this.generateTextWithGroq(prompt);
      return { hint, model: 'groq' };
    } catch (error) {
      logger.warn('Groq hint generation failed, using Gemini:', error);
      const hint = await this.generateTextWithGemini(prompt);
      return { hint, model: 'gemini' };
    }
  }

  async evaluateSubmission(
      questions: QuizQuestion[],
      answers: SubmissionAnswer[]
  ): Promise<{ evaluation: EvaluationResult, model: 'groq' | 'gemini' }> {
    const prompt = this.buildEvaluationPrompt(questions, answers);

    try {
      const evaluation = await this.evaluateWithGroq(prompt);
      return { evaluation, model: 'groq' };
    } catch (error) {
      logger.warn('Groq evaluation failed, using Gemini:', error);
      const evaluation = await this.evaluateWithGemini(prompt);
      return { evaluation, model: 'gemini' };
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

  private async generateWithGroq(prompt: string): Promise<QuizQuestion[]> {
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
      model: 'llama-3.1-70b-versatile', // Best free Groq model
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
    const result = await this.geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  private async evaluateWithGroq(prompt: string): Promise<EvaluationResult> {
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

export const aiService = new AIService();
