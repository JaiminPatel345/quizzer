import Joi from 'joi';

export const evaluateSubmissionSchema = {
  body: Joi.object({
    questions: Joi.array()
    .items(
        Joi.object({
          questionId: Joi.string().required(),
          questionText: Joi.string().required(),
          questionType: Joi.string().valid('mcq', 'true_false').required(),
          difficulty: Joi.string().valid('easy', 'medium', 'hard', 'mixed', 'adaptive').required(),
          topic: Joi.string().required(),
          correctAnswer: Joi.string().required(),
          options: Joi.array().items(Joi.string()).optional(),
          points: Joi.number().min(0).optional(),
          explanation: Joi.string().optional(),
          hints: Joi.array().items(Joi.string()).optional()
        })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one question is required',
      'any.required': 'Questions array is required'
    }),

    answers: Joi.array()
    .items(
        Joi.object({
          questionId: Joi.string().required(),
          userAnswer: Joi.string().required(),
          isCorrect: Joi.boolean().required(),
          pointsEarned: Joi.number().min(0).required(),
          timeSpent: Joi.number().min(0).default(0),
          hintsUsed: Joi.number().integer().min(0).default(0)
        })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one answer is required',
      'any.required': 'Answers array is required'
    })
  })
};

export const getSuggestionsSchema = {
  body: Joi.object({
    performanceData: Joi.object({
      averageScore: Joi.number().min(0).max(100).required(),
      totalQuizzes: Joi.number().integer().min(0).required(),
      strongSubjects: Joi.array().items(Joi.string()).optional(),
      weakSubjects: Joi.array().items(Joi.string()).optional(),
      recentPerformance: Joi.array().optional()
    }).required(),

    subject: Joi.string().trim().max(100).optional(),
    grade: Joi.number().integer().min(1).max(12).optional()
  })
};
