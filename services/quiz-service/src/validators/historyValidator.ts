import Joi from 'joi';

export const getQuizHistorySchema = {
  query: Joi.object({
    quizId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid quiz ID format'
    }),

    grade: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .optional()
    .messages({
      'number.base': 'Grade must be a number',
      'number.integer': 'Grade must be an integer',
      'number.min': 'Grade must be at least 1',
      'number.max': 'Grade cannot exceed 12'
    }),

    subject: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Subject must be at least 2 characters long',
      'string.max': 'Subject cannot exceed 100 characters'
    }),

    minScore: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.min': 'Minimum score cannot be negative',
      'number.max': 'Minimum score cannot exceed 100'
    }),

    maxScore: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.min': 'Maximum score cannot be negative',
      'number.max': 'Maximum score cannot exceed 100'
    }),

    from: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'From date must be in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)'
    }),

    to: Joi.date()
    .iso()
    .min(Joi.ref('from'))
    .optional()
    .messages({
      'date.format': 'To date must be in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)',
      'date.min': 'To date cannot be before from date'
    }),

    page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),

    limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

    sortBy: Joi.string()
    .valid('completedDate', 'score', 'attemptNumber')
    .default('completedDate')
    .messages({
      'any.only': 'Sort by must be completedDate, score, or attemptNumber'
    }),

    sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be asc or desc'
    })
  }).custom((value, helpers) => {
    // Validate score range
    if (value.minScore !== undefined && value.maxScore !== undefined && value.minScore > value.maxScore) {
      return helpers.message({ custom: 'minScore cannot be greater than maxScore' });
    }

    return value;
  })
};
