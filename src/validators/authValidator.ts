import Joi from 'joi';

export const loginSchema = {
  body: Joi.object({
    username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must only contain alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot be longer than 30 characters',
      'any.required': 'Username is required'
    }),

    password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot be longer than 100 characters',
      'any.required': 'Password is required'
    })
  })
};

export const registerSchema = {
  body: Joi.object({
    username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must only contain alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot be longer than 30 characters',
      'any.required': 'Username is required'
    }),

    email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

    password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot be longer than 100 characters',
      'any.required': 'Password is required'
    }),

    profile: Joi.object({
      firstName: Joi.string().max(50).optional(),
      lastName: Joi.string().max(50).optional(),
      grade: Joi.number().integer().min(1).max(12).optional(),
      preferredSubjects: Joi.array().items(Joi.string().max(100)).optional()
    }).optional(),

    preferences: Joi.object({
      emailNotifications: Joi.boolean().optional(),
      difficulty: Joi.string().valid('easy', 'medium', 'hard', 'adaptive').optional()
    }).optional()
  })
};
