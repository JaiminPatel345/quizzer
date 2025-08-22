import Joi from 'joi';

export const generateQuizSchema = {
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
      'number.max': 'Grade cannot be more than 12',
      'any.required': 'Grade is required'
    }),

    subject: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Subject must be at least 2 characters long',
      'string.max': 'Subject cannot be longer than 100 characters',
      'any.required': 'Subject is required'
    }),

    difficulty: Joi.string()
    .valid('easy', 'medium', 'hard', 'mixed')
    .default('mixed')
    .messages({
      'any.only': 'Difficulty must be easy, medium, hard, or mixed'
    }),

    totalQuestions: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .messages({
      'number.base': 'Total questions must be a number',
      'number.integer': 'Total questions must be an integer',
      'number.min': 'Must have at least 1 question',
      'number.max': 'Cannot have more than 50 questions'
    }),

    timeLimit: Joi.number()
    .integer()
    .min(5)
    .max(180)
    .default(30)
    .messages({
      'number.base': 'Time limit must be a number',
      'number.integer': 'Time limit must be an integer',
      'number.min': 'Time limit must be at least 5 minutes',
      'number.max': 'Time limit cannot exceed 180 minutes'
    }),

    topics: Joi.array()
    .items(Joi.string().trim().max(100))
    .optional()
    .messages({
      'array.base': 'Topics must be an array'
    })
  })
};

export const hintRequestSchema = {
  body: Joi.object({
    quizId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid quiz ID format',
      'any.required': 'Quiz ID is required'
    }),

    questionId: Joi.string()
    .trim()
    .required()
    .messages({
      'any.required': 'Question ID is required'
    })
  })
};

export const quizHistorySchema = {
  query: Joi.object({
    grade: Joi.number().integer().min(1).max(12).optional(),
    subject: Joi.string().trim().max(100).optional(),
    minScore: Joi.number().min(0).max(100).optional(),
    maxScore: Joi.number().min(0).max(100).optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'score', 'subject', 'grade').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }).custom((value, helpers) => {
    // Validate score range
    if (value.minScore !== undefined && value.maxScore !== undefined && value.minScore > value.maxScore) {
      return helpers.message({ custom: 'minScore cannot be greater than maxScore' });
    }

    // Validate date range
    if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
      return helpers.message({ custom: 'from date cannot be after to date' });
    }

    return value;
  })
};

export const retryQuizSchema = {
  params: Joi.object({
    quizId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid quiz ID format',
      'any.required': 'Quiz ID is required'
    })
  })
};
