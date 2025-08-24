import Joi from 'joi';

export const updateQuestionHintsSchema = {
  params: Joi.object({
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
  }),

  body: Joi.object({
    hints: Joi.array()
    .items(Joi.string().trim().min(1).max(200))
    .min(1)
    .max(5)
    .required()
    .messages({
      'array.base': 'Hints must be an array',
      'array.min': 'At least one hint is required',
      'array.max': 'Cannot have more than 5 hints',
      'any.required': 'Hints are required'
    })
  })
};

export const generateHintForQuestionSchema = {
  params: Joi.object({
    quizId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid quiz ID format',
        'any.required': 'Quiz ID is required'
      }),
    questionId: Joi.string()
      .trim()
      .min(1)
      .required()
      .messages({
        'string.min': 'Question ID cannot be empty',
        'any.required': 'Question ID is required'
      })
  })
};

