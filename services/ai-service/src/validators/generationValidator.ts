import Joi from 'joi';

export const generateQuestionsSchema = {
  body: Joi.object({
    grade: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required()
    .messages({
      'number.base': 'Grade must be a number',
      'number.integer': 'Grade must be an integer',
      'number.min': 'Grade must be at least 1',
      'number.max': 'Grade cannot exceed 12',
      'any.required': 'Grade is required'
    }),

    subject: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Subject must be at least 2 characters long',
      'string.max': 'Subject cannot exceed 100 characters',
      'any.required': 'Subject is required'
    }),

    difficulty: Joi.string()
    .valid('easy', 'medium', 'hard', 'mixed')
    .required()
    .messages({
      'any.only': 'Difficulty must be easy, medium, hard, or mixed',
      'any.required': 'Difficulty is required'
    }),

    totalQuestions: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .required()
    .messages({
      'number.base': 'Total questions must be a number',
      'number.integer': 'Total questions must be an integer',
      'number.min': 'Must have at least 1 question',
      'number.max': 'Cannot exceed 50 questions',
      'any.required': 'Total questions is required'
    }),

    topics: Joi.array()
    .items(Joi.string().trim().max(100))
    .optional()
    .messages({
      'array.base': 'Topics must be an array'
    }),

    adaptiveParams: Joi.object({
      userPastPerformance: Joi.object().optional(),
      difficultyDistribution: Joi.object().optional()
    }).optional()
  })
};

export const adaptiveQuestionsSchema = {
  body: Joi.object({
    baseParams: Joi.object({
      grade: Joi.number().integer().min(1).max(12).required(),
      subject: Joi.string().trim().min(2).max(100).required(),
      totalQuestions: Joi.number().integer().min(1).max(50).required(),
      topics: Joi.array().items(Joi.string().trim().max(100)).optional()
    }).required(),

    userPerformanceData: Joi.object({
      averageScore: Joi.number().min(0).max(100).required(),
      totalQuizzes: Joi.number().integer().min(0).required(),
      strongSubjects: Joi.array().items(Joi.string()).optional(),
      weakSubjects: Joi.array().items(Joi.string()).optional(),
      recentPerformance: Joi.array().optional()
    }).required()
  })
};

export const generateHintSchema = {
  body: Joi.object({
    question: Joi.object({
      questionId: Joi.string().required(),
      questionText: Joi.string().min(10).max(1000).required(),
      questionType: Joi.string().valid('mcq', 'true_false', 'short_answer').required(),
      difficulty: Joi.string().valid('easy', 'medium', 'hard').required(),
      topic: Joi.string().min(2).max(100).required(),
      options: Joi.array().items(Joi.string()).optional(),
      correctAnswer: Joi.string().optional()
    }).required()
  })
};
