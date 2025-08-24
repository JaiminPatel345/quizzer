import Joi from 'joi';

export const submitQuizSchema = {
  body: Joi.object({
    quizId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid quiz ID format',
      'any.required': 'Quiz ID is required'
    }),

    answers: Joi.array()
    .items(
        Joi.object({
          questionId: Joi.string()
          .trim()
          .required()
          .messages({
            'any.required': 'Question ID is required'
          }),

          userAnswer: Joi.string()
          .trim()
          .required()
          .messages({
            'any.required': 'User answer is required'
          }),

          timeSpent: Joi.number()
          .min(0)
          .max(7200) // 2 hours max per question
              .default(0)
              .messages({
                'number.min': 'Time spent cannot be negative',
                'number.max': 'Time spent per question cannot exceed 2 hours'
              }),

          hintsUsed: Joi.number()
          .integer()
          .min(0)
          .max(10)
          .default(0)
          .messages({
            'number.integer': 'Hints used must be an integer',
            'number.min': 'Hints used cannot be negative',
            'number.max': 'Cannot use more than 10 hints per question'
          })
        })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one answer is required',
      'any.required': 'Answers are required'
    }),

    startedAt: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'Start time is required'
    }),

    submittedAt: Joi.date()
    .iso()
    .min(Joi.ref('startedAt'))
    .default(() => new Date())
    .messages({
      'date.min': 'Submission time cannot be before start time'
    }),

    requestEvaluation: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Request evaluation must be a boolean'
    })
  })
};

export const getSubmissionsSchema = {
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
      'date.format': 'From date must be in ISO format'
    }),

    to: Joi.date()
    .iso()
    .min(Joi.ref('from'))
    .optional()
    .messages({
      'date.format': 'To date must be in ISO format',
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
    .valid('timing.submittedAt', 'scoring.scorePercentage', 'attemptNumber')
    .default('timing.submittedAt')
    .messages({
      'any.only': 'Sort by must be timing.submittedAt, scoring.scorePercentage, or attemptNumber'
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

export const getQuizAttemptsSchema = {
  params: Joi.object({
    quizId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid quiz ID format',
        'any.required': 'Quiz ID is required'
      })
  }),
  query: Joi.object({
    sortBy: Joi.string()
      .valid('attemptNumber', 'score', 'date')
      .default('attemptNumber')
      .messages({
        'any.only': 'Sort by must be attemptNumber, score, or date'
      }),

    order: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
      .messages({
        'any.only': 'Order must be asc or desc'
      }),

    includeDetails: Joi.string()
      .valid('true', 'false')
      .default('false')
      .messages({
        'any.only': 'Include details must be true or false'
      })
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
  }),
  body: Joi.object({
    answers: Joi.array()
      .items(
        Joi.object({
          questionId: Joi.string()
            .trim()
            .required()
            .messages({
              'any.required': 'Question ID is required'
            }),

          userAnswer: Joi.string()
            .trim()
            .required()
            .messages({
              'any.required': 'User answer is required'
            }),

          timeSpent: Joi.number()
            .min(0)
            .max(7200)
            .default(0)
            .messages({
              'number.min': 'Time spent cannot be negative',
              'number.max': 'Time spent per question cannot exceed 2 hours'
            }),

          hintsUsed: Joi.number()
            .integer()
            .min(0)
            .max(10)
            .default(0)
            .messages({
              'number.integer': 'Hints used must be an integer',
              'number.min': 'Hints used cannot be negative',
              'number.max': 'Cannot use more than 10 hints per question'
            })
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one answer is required',
        'any.required': 'Answers array is required'
      }),

    startedAt: Joi.date()
      .iso()
      .required()
      .messages({
        'date.format': 'Started at must be in ISO format',
        'any.required': 'Started at timestamp is required'
      }),

    submittedAt: Joi.date()
      .iso()
      .greater(Joi.ref('startedAt'))
      .required()
      .messages({
        'date.format': 'Submitted at must be in ISO format',
        'date.greater': 'Submitted at must be after started at',
        'any.required': 'Submitted at timestamp is required'
      }),

    requestEvaluation: Joi.boolean()
      .default(true)
      .messages({
        'boolean.base': 'Request evaluation must be a boolean'
      })
  })
};

export const compareAttemptsSchema = {
  params: Joi.object({
    quizId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid quiz ID format',
        'any.required': 'Quiz ID is required'
      })
  }),
  query: Joi.object({
    attempt1: Joi.number()
      .integer()
      .min(1)
      .required()
      .messages({
        'number.integer': 'Attempt 1 must be an integer',
        'number.min': 'Attempt 1 must be at least 1',
        'any.required': 'Attempt 1 is required'
      }),

    attempt2: Joi.number()
      .integer()
      .min(1)
      .required()
      .messages({
        'number.integer': 'Attempt 2 must be an integer',
        'number.min': 'Attempt 2 must be at least 1',
        'any.required': 'Attempt 2 is required'
      })
  }).custom((value, helpers) => {
    if (value.attempt1 === value.attempt2) {
      return helpers.message({ custom: 'Cannot compare the same attempt' });
    }
    return value;
  })
};

export const getBestAttemptSchema = {
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
