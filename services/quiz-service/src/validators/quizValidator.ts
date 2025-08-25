import Joi from 'joi';

export const createQuizSchema = {
  body: Joi.object({
    title: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required'
    }),

    description: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),

    metadata: Joi.object({
      grade: Joi.number()
      .integer()
      .min(1)
      .max(12)
      .required()
      .messages({
        'number.base': 'Grade must be a number',
        'number.integer': 'Grade must be an integer',
        'number.min': 'Grade must be at least 1',
        'number.max': 'Grade cannot exceed 12',
        'any.required': 'Grade is required'
      }),

      subject: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Subject must be at least 2 characters long',
        'string.max': 'Subject cannot exceed 100 characters',
        'any.required': 'Subject is required'
      }),

      totalQuestions: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .required()
      .messages({
        'number.base': 'Total questions must be a number',
        'number.integer': 'Total questions must be an integer',
        'number.min': 'Must have at least 1 question',
        'number.max': 'Cannot exceed 50 questions',
        'any.required': 'Total questions is required'
      }),

      timeLimit: Joi.number()
      .integer()
      .min(5)
      .max(180)
      .required()
      .messages({
        'number.base': 'Time limit must be a number',
        'number.integer': 'Time limit must be an integer',
        'number.min': 'Time limit must be at least 5 minutes',
        'number.max': 'Time limit cannot exceed 180 minutes',
        'any.required': 'Time limit is required'
      }),

      difficulty: Joi.string()
      .valid('easy', 'medium', 'hard', 'mixed')
      .required()
      .messages({
        'any.only': 'Difficulty must be easy, medium, hard, or mixed',
        'any.required': 'Difficulty is required'
      }),

      tags: Joi.array()
      .items(Joi.string().trim().max(50))
      .optional()
      .messages({
        'array.base': 'Tags must be an array'
      }),

      category: Joi.string()
      .trim()
      .max(100)
      .optional()
      .messages({
        'string.max': 'Category cannot exceed 100 characters'
      })
    }).required(),

    questions: Joi.array()
    .items(
        Joi.object({
          questionId: Joi.string()
          .trim()
          .required()
          .messages({
            'any.required': 'Question ID is required'
          }),

          questionText: Joi.string()
          .trim()
          .min(10)
          .max(1000)
          .required()
          .messages({
            'string.min': 'Question text must be at least 10 characters long',
            'string.max': 'Question text cannot exceed 1000 characters',
            'any.required': 'Question text is required'
          }),

          questionType: Joi.string()
          .valid('mcq', 'true_false', 'short_answer')
          .required()
          .messages({
            'any.only': 'Question type must be mcq, true_false, or short_answer',
            'any.required': 'Question type is required'
          }),

          options: Joi.array()
          .items(Joi.string().trim().max(200))
          .when('questionType', {
            is: 'mcq',
            then: Joi.array()
            .items(Joi.string().trim().max(200))
            .required()
            .min(2)
            .max(6)
            .messages({
              'array.min': 'MCQ questions must have at least 2 options',
              'array.max': 'MCQ questions cannot have more than 6 options'
            }),
            otherwise: Joi.optional()
          })
          .messages({
            'array.min': 'MCQ questions must have at least 2 options',
            'array.max': 'MCQ questions cannot have more than 6 options'
          }),

          correctAnswer: Joi.string()
          .trim()
          .required()
          .messages({
            'any.required': 'Correct answer is required'
          }),

          explanation: Joi.string()
          .trim()
          .max(500)
          .optional()
          .messages({
            'string.max': 'Explanation cannot exceed 500 characters'
          }),

          difficulty: Joi.string()
          .valid('easy', 'medium', 'hard')
          .required()
          .messages({
            'any.only': 'Question difficulty must be easy, medium, or hard',
            'any.required': 'Question difficulty is required'
          }),

          points: Joi.number()
          .integer()
          .min(1)
          .max(10)
          .default(1)
          .messages({
            'number.base': 'Points must be a number',
            'number.integer': 'Points must be an integer',
            'number.min': 'Points must be at least 1',
            'number.max': 'Points cannot exceed 10'
          }),

          hints: Joi.array()
          .items(Joi.string().trim().max(200))
          .max(5)
          .optional()
          .messages({
            'array.base': 'Hints must be an array',
            'array.max': 'Cannot have more than 5 hints per question'
          }),

          topic: Joi.string()
          .trim()
          .min(2)
          .max(100)
          .required()
          .messages({
            'string.min': 'Topic must be at least 2 characters long',
            'string.max': 'Topic cannot exceed 100 characters',
            'any.required': 'Topic is required'
          })
        })
    )
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'Quiz must have at least 1 question',
      'array.max': 'Quiz cannot have more than 50 questions',
      'any.required': 'Questions are required'
    }),

    template: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Template name cannot exceed 100 characters'
    }),

    isPublic: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'isPublic must be a boolean'
    })
  })
};

export const getQuizzesSchema = {
  query: Joi.object({
    grade: Joi.number().integer().min(1).max(12).optional(),
    subject: Joi.string().trim().max(100).optional(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard', 'mixed').optional(),
    category: Joi.string().trim().max(100).optional(),
    tags: Joi.string().optional(),
    isPublic: Joi.boolean().optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().min(Joi.ref('from')).optional(),
    marks: Joi.number().min(0).max(100).optional(),
    completedDate: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'title', 'metadata.grade', 'metadata.subject').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  })
};

export const updateQuizSchema = {
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
    title: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .optional()
    .messages({
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 200 characters'
    }),

    description: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),

    isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean'
    }),

    isPublic: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isPublic must be a boolean'
    })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  })
};

export const deleteQuizSchema = {
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

export const duplicateQuizSchema = {
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
    title: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .optional()
    .messages({
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 200 characters'
    })
  })
};

export const createAIQuizSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(3).max(200).required(),
    description: Joi.string().trim().max(1000).optional(),

    generationParams: Joi.object({
      grade: Joi.number().integer().min(1).max(12).required(),
      subject: Joi.string().trim().min(2).max(100).required(),
      difficulty: Joi.string().valid('easy', 'medium', 'hard', 'mixed').default('mixed'),
      totalQuestions: Joi.number().integer().min(1).max(50).default(10),
      topics: Joi.array().items(Joi.string().trim().max(100)).optional(),

      // NEW: Adaptive generation flag
      adaptiveGeneration: Joi.boolean().default(false)
    }).required(),

    metadata: Joi.object({
      timeLimit: Joi.number().integer().min(5).max(180).default(30),
      tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
      category: Joi.string().trim().max(100).optional()
    }).optional(),

    isPublic: Joi.boolean().default(false)
  })
};

export const getQuizByIdSchema = {
  params: Joi.object({
    quizId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  }),
  query: Joi.object({
    includeHints: Joi.boolean().default(false),
    includeAnswers: Joi.boolean().default(false),
    internal: Joi.boolean().default(false)
  })
};

export const adjustQuizDifficultySchema = {
  body: Joi.object({
    quizId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Quiz ID must be a valid MongoDB ObjectId',
        'any.required': 'Quiz ID is required'
      }),

    currentAnswers: Joi.array()
      .items(
        Joi.object({
          questionId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
              'string.pattern.base': 'Question ID must be a valid MongoDB ObjectId',
              'any.required': 'Question ID is required'
            }),
          
          selectedAnswer: Joi.alternatives()
            .try(
              Joi.string().trim().min(1),
              Joi.array().items(Joi.string().trim().min(1)),
              Joi.number()
            )
            .required()
            .messages({
              'any.required': 'Selected answer is required'
            }),
          
          isCorrect: Joi.boolean()
            .required()
            .messages({
              'any.required': 'Answer correctness status is required'
            }),
          
          timeSpent: Joi.number()
            .positive()
            .required()
            .messages({
              'number.positive': 'Time spent must be a positive number',
              'any.required': 'Time spent is required'
            }),
          
          difficulty: Joi.string()
            .valid('easy', 'medium', 'hard')
            .required()
            .messages({
              'any.only': 'Question difficulty must be easy, medium, or hard',
              'any.required': 'Question difficulty is required'
            })
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one answer is required',
        'any.required': 'Current answers are required'
      }),

    remainingQuestions: Joi.number()
      .integer()
      .min(0)
      .required()
      .messages({
        'number.integer': 'Remaining questions must be an integer',
        'number.min': 'Remaining questions cannot be negative',
        'any.required': 'Remaining questions count is required'
      }),

    currentDifficulty: Joi.string()
      .valid('easy', 'medium', 'hard', 'adaptive')
      .required()
      .messages({
        'any.only': 'Current difficulty must be easy, medium, hard, or adaptive',
        'any.required': 'Current difficulty is required'
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

    timeRemaining: Joi.number()
      .positive()
      .optional()
      .messages({
        'number.positive': 'Time remaining must be a positive number'
      })
  })
};
