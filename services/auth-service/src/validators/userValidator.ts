import Joi from 'joi';

export const updateProfileSchema = {
  body: Joi.object({
    profile: Joi.object({
      firstName: Joi.string().trim().max(50).optional().allow('').messages({
        'string.max': 'First name cannot exceed 50 characters',
      }),

      lastName: Joi.string().trim().max(50).optional().allow('').messages({
        'string.max': 'Last name cannot exceed 50 characters',
      }),

      grade: Joi.number().
          integer().
          min(1).
          max(12).
          optional().
          allow(null).
          messages({
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
    }).optional(),

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
  }).min(1).messages({
    'object.min': 'At least one field (profile or preferences) must be provided',
  }),
};
