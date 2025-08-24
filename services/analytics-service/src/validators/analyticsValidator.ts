import Joi from 'joi';

export const getUserPerformanceSchema = {
  query: Joi.object({
    subject: Joi.string().trim().max(100).optional(),
    grade: Joi.number().integer().min(1).max(12).optional(),
  }),
};

export const getSubjectPerformanceSchema = {
  params: Joi.object({
    subject: Joi.string().trim().min(2).max(100).required().messages({
      'string.min': 'Subject must be at least 2 characters long',
      'string.max': 'Subject cannot exceed 100 characters',
      'any.required': 'Subject is required',
    }),

    grade: Joi.number().integer().min(1).max(12).required().messages({
      'number.base': 'Grade must be a number',
      'number.integer': 'Grade must be an integer',
      'number.min': 'Grade must be at least 1',
      'number.max': 'Grade cannot exceed 12',
      'any.required': 'Grade is required',
    }),
  }),
};

export const updatePerformanceSchema = {
  body: Joi.object({
    subject: Joi.string().trim().min(2).max(100).required().messages({
      'string.min': 'Subject must be at least 2 characters long',
      'string.max': 'Subject cannot exceed 100 characters',
      'any.required': 'Subject is required',
    }),

    grade: Joi.number().integer().min(1).max(12).required().messages({
      'number.base': 'Grade must be a number',
      'number.integer': 'Grade must be an integer',
      'number.min': 'Grade must be at least 1',
      'number.max': 'Grade cannot exceed 12',
      'any.required': 'Grade is required',
    }),

    submissionData: Joi.object({
      quizId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      scoring: Joi.object({
        scorePercentage: Joi.number().min(0).max(100).required(),
        totalQuestions: Joi.number().integer().min(1).required(),
        correctAnswers: Joi.number().integer().min(0).required(),
      }).required(),
      timing: Joi.object({
        totalTimeSpent: Joi.number().min(0).required(),
      }).required(),
      answers: Joi.array().items(Joi.object({
        questionId: Joi.string().required(),
        topic: Joi.string().optional(),
        isCorrect: Joi.boolean().required(),
        timeSpent: Joi.number().min(0).optional(),
      })).optional(),
      difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
    }).required(),
  }),
};

export const leaderboardSchema = {
  query: Joi.object({
    type: Joi.string().valid('overall', 'grade', 'subject', 'grade_subject').default(
        'overall').messages({
      'any.only': 'Type must be overall, grade, subject, or grade_subject',
    }),

    grade: Joi.number().integer().min(1).max(12).when('type', {
      is: Joi.valid('grade', 'grade_subject'), 
      then: Joi.required(), 
      otherwise: Joi.optional(),
    }).messages({
      'number.base': 'Grade must be a number',
      'number.integer': 'Grade must be an integer',
      'number.min': 'Grade must be at least 1',
      'number.max': 'Grade cannot exceed 12',
      'any.required': 'Grade is required for grade or grade_subject leaderboard',
    }),

    subject: Joi.string().trim().max(100).when('type', {
      is: Joi.valid('subject', 'grade_subject'), 
      then: Joi.required(), 
      otherwise: Joi.optional(),
    }).messages({
      'string.max': 'Subject cannot exceed 100 characters',
      'any.required': 'Subject is required for subject or grade_subject leaderboard',
    }),

    timeframe: Joi.string().valid('all_time', 'monthly', 'weekly', 'daily').default(
        'all_time').messages({
      'any.only': 'Timeframe must be all_time, monthly, weekly, or daily',
    }),

    month: Joi.number().integer().min(1).max(12).when('timeframe', {
      is: 'monthly', then: Joi.optional(), otherwise: Joi.forbidden(),
    }).messages({
      'number.base': 'Month must be a number',
      'number.integer': 'Month must be an integer',
      'number.min': 'Month must be at least 1',
      'number.max': 'Month cannot exceed 12',
    }),

    year: Joi.number().integer().min(2020).max(2050).when('timeframe', {
      is: 'monthly', then: Joi.optional(), otherwise: Joi.forbidden(),
    }).messages({
      'number.base': 'Year must be a number',
      'number.integer': 'Year must be an integer',
      'number.min': 'Year must be at least 2020',
      'number.max': 'Year cannot exceed 2050',
    }),

    limit: Joi.number().integer().min(1).max(100).default(50).messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),

    includeUser: Joi.string().valid('true', 'false').default('false').messages({
      'any.only': 'includeUser must be true or false',
    }),

    sortBy: Joi.string().valid('score', 'average', 'consistency', 'quizzes').default('score').messages({
      'any.only': 'sortBy must be score, average, consistency, or quizzes',
    }),
  }),
};
