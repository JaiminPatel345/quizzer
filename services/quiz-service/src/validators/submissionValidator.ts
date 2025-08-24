import Joi from 'joi';

export const submitQuizSchema = {
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
    .default(true)
    .messages({
      'boolean.base': 'Request evaluation must be a boolean'
    }),

    sendAnalyticsToEmail: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Send analytics to email must be a boolean'
    })
  })
};
