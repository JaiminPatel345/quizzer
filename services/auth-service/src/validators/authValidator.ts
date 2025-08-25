import Joi from 'joi';

export const loginSchema = {
  body: Joi.object({
    username: Joi.string().trim().min(3).max(30).required().messages({
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Username is required',
    }),

    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required',
    }),
  }),
};

export const registerSchema = {
  body: Joi.object({
    username: Joi.string().trim().min(3).max(30).required().messages({
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Username is required',
    }),

    email: Joi.string().email().trim().lowercase().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required',
    }),

    profile: Joi.object({
      firstName: Joi.string().trim().min(1).max(50).required().messages({
        'string.min': 'First name is required',
        'string.max': 'First name cannot exceed 50 characters',
        'any.required': 'First name is required',
      }),

      lastName: Joi.string().trim().min(1).max(50).required().messages({
        'string.min': 'Last name is required',
        'string.max': 'Last name cannot exceed 50 characters',
        'any.required': 'Last name is required',
      }),

      grade: Joi.number().integer().min(1).max(12).optional().messages({
        'number.base': 'Grade must be a number',
        'number.integer': 'Grade must be an integer',
        'number.min': 'Grade must be at least 1',
        'number.max': 'Grade cannot exceed 12',
      }),

      preferredSubjects: Joi.array().
          items(Joi.string().trim().max(100)).
          optional().
          messages({
            'array.base': 'Preferred subjects must be an array',
          }),
    }).required().messages({
      'any.required': 'Profile information is required',
    }),

    preferences: Joi.object({
      emailNotifications: Joi.boolean().optional().messages({
        'boolean.base': 'Email notifications must be a boolean',
      }),

      difficulty: Joi.string().
          valid('easy', 'medium', 'hard', 'adaptive').
          optional().
          messages({
            'any.only': 'Difficulty must be easy, medium, hard, or adaptive',
          }),
    }).optional(),
  }),
};
