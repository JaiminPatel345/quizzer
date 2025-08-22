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

    sendEmail: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Send email must be a boolean'
    })
  })
};

export const leaderboardSchema = {
  query: Joi.object({
    type: Joi.string()
    .valid('grade_subject', 'overall', 'monthly')
    .default('overall')
    .messages({
      'any.only': 'Type must be grade_subject, overall, or monthly'
    }),

    grade: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .when('type', {
      is: 'grade_subject',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'number.base': 'Grade must be a number',
      'number.integer': 'Grade must be an integer',
      'number.min': 'Grade must be at least 1',
      'number.max': 'Grade cannot be more than 12',
      'any.required': 'Grade is required for grade_subject leaderboard'
    }),

    subject: Joi.string()
    .trim()
    .max(100)
    .when('type', {
      is: 'grade_subject',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.max': 'Subject cannot be longer than 100 characters',
      'any.required': 'Subject is required for grade_subject leaderboard'
    }),

    timeframe: Joi.string()
    .valid('all_time', 'monthly', 'weekly')
    .default('all_time')
    .messages({
      'any.only': 'Timeframe must be all_time, monthly, or weekly'
    }),

    month: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .when('timeframe', {
      is: 'monthly',
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    })
    .messages({
      'number.base': 'Month must be a number',
      'number.integer': 'Month must be an integer',
      'number.min': 'Month must be at least 1',
      'number.max': 'Month cannot be more than 12'
    }),

    year: Joi.number()
    .integer()
    .min(2020)
    .max(2050)
    .when('timeframe', {
      is: 'monthly',
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    })
    .messages({
      'number.base': 'Year must be a number',
      'number.integer': 'Year must be an integer',
      'number.min': 'Year must be at least 2020',
      'number.max': 'Year cannot be more than 2050'
    }),

    limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot be more than 100'
    })
  })
};

export const emailNotificationSchema = {
  body: Joi.object({
    submissionId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid submission ID format',
      'any.required': 'Submission ID is required'
    })
  })
};
