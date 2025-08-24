import Groq from 'groq-sdk';
import {logger} from '../utils/logger.js';
import { QuestionTypeNormalizer, ValidQuestionType } from '../utils/questionTypeUtils.js';
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
      const jsonStart = Math.min(
          cleaned.indexOf('[') !== -1 ? cleaned.indexOf('[') : cleaned.length,
          cleaned.indexOf('{') !== -1 ? cleaned.indexOf('{') : cleaned.length,
      );

      if (jsonStart < cleaned.length) {
        cleaned = cleaned.substring(jsonStart);
      }

      // Parse JSON
      const parsed = JSON.parse(cleaned);

      // Handle different response formats
      let rawQuestions: any[] = [];
      if (Array.isArray(parsed)) {
        rawQuestions = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        rawQuestions = parsed.questions;
      } else if (typeof parsed === 'object') {
        // If it's an object, try to extract array from common keys
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
            content: 'You are an expert education content creator. You MUST respond with ONLY a valid JSON array of quiz questions. Do not include any explanatory text, markdown formatting, or wrapper objects. Return directly the JSON array starting with [ and ending with ]. Use EXACTLY these questionType values: "mcq", "true_false", "short_answer". Create ORIGINAL and DIVERSE questions - never repeat the same examples.',
          }, {
            role: 'user', content: prompt,
          },
        ],
        model: this.getAvailableModel(),
        max_completion_tokens: 4000,
        temperature: 0.1, // Lower temperature for more consistent formatting
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
        temperature: 0.1, // Lower temperature for consistent JSON
      });

      const processingTime = Date.now() - startTime;
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from Groq');
      }

      // Clean and parse JSON
      let cleaned = content.replace(/``````/g, '').trim();
      const evaluation = JSON.parse(cleaned);

      // Ensure exactly 2 suggestions as per requirements
      if (evaluation.suggestions && evaluation.suggestions.length !== 2) {
        if (evaluation.suggestions.length > 2) {
          evaluation.suggestions = evaluation.suggestions.slice(0, 2);
        } else if (evaluation.suggestions.length < 2) {
          // Add generic suggestion if needed
          const generic = "Review the incorrect answers and practice similar questions to improve understanding.";
          while (evaluation.suggestions.length < 2) {
            evaluation.suggestions.push(generic);
          }
        }
      } else if (!evaluation.suggestions) {
        evaluation.suggestions = [
          "Review the areas where you made mistakes and practice similar questions.",
          "Focus on understanding the underlying concepts rather than memorizing answers."
        ];
      }

      logger.info('Evaluation completed successfully with Groq', {
        processingTime, 
        model: this.getAvailableModel(),
        suggestionsCount: evaluation.suggestions?.length || 0
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

  private buildEvaluationPrompt(
      questions: QuizQuestion[], answers: SubmissionAnswer[]): string {
    const wrongAnswers = answers.filter(answer => !answer.isCorrect);
    const correctAnswers = answers.filter(answer => answer.isCorrect);
    
    // Build detailed analysis of wrong answers
    const wrongAnswerDetails = wrongAnswers.map(answer => {
      const question = questions.find(q => q.questionId === answer.questionId);
      return {
        questionText: question?.questionText,
        topic: question?.topic,
        difficulty: question?.difficulty,
        correctAnswer: question?.correctAnswer,
        userAnswer: answer.userAnswer,
        explanation: question?.explanation
      };
    }).filter(detail => detail.questionText);

    // Build analysis of correct answers for strengths
    const correctAnswerDetails = correctAnswers.map(answer => {
      const question = questions.find(q => q.questionId === answer.questionId);
      return {
        topic: question?.topic,
        difficulty: question?.difficulty
      };
    }).filter(detail => detail.topic);

    const wrongAnswersText = wrongAnswerDetails.length > 0 ? 
      wrongAnswerDetails.map((detail, index) => 
        `Wrong Answer ${index + 1}:
        Question: ${detail.questionText}
        Topic: ${detail.topic}
        Difficulty: ${detail.difficulty}
        Correct Answer: ${detail.correctAnswer}
        Your Answer: ${detail.userAnswer}
        Explanation: ${detail.explanation || 'N/A'}`
      ).join('\n\n') : 'No wrong answers';

    return `Analyze this quiz performance and provide targeted feedback based on specific mistakes:

QUIZ PERFORMANCE SUMMARY:
- Total Questions: ${questions.length}
- Correct Answers: ${correctAnswers.length}
- Wrong Answers: ${wrongAnswers.length}
- Score: ${Math.round((correctAnswers.length / questions.length) * 100)}%

DETAILED WRONG ANSWERS ANALYSIS:
${wrongAnswersText}

CORRECT ANSWERS TOPICS:
${correctAnswerDetails.map(detail => `${detail.topic} (${detail.difficulty})`).join(', ') || 'None'}

INSTRUCTIONS:
1. Provide EXACTLY 2 specific, actionable improvement tips based on the actual wrong answers and topics where the student struggled
2. Identify strengths based on correct answers and topics mastered
3. Identify weaknesses based on wrong answers and knowledge gaps
4. Make suggestions specific to the subject matter and learning areas shown in the mistakes

Return ONLY this JSON structure with NO markdown formatting:
{
  "suggestions": [
    "First specific improvement tip based on actual mistakes made",
    "Second specific improvement tip based on patterns in wrong answers"
  ],
  "strengths": [
    "Specific strength based on correct answers",
    "Another strength shown in performance"
  ],
  "weaknesses": [
    "Specific weakness based on wrong answers",
    "Another area needing improvement"
  ]
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