import Joi from 'joi';

export const generateQuestionsSchema = {
  body: Joi.object({
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

    difficulty: Joi.string()
    .valid('easy', 'medium', 'hard', 'mixed')
    .required()
    .messages({
      'any.only': 'Difficulty must be easy, medium, hard, or mixed',
      'any.required': 'Difficulty is required'
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

    topics: Joi.array()
    .items(Joi.string().trim().max(100))
    .optional()
    .messages({
      'array.base': 'Topics must be an array'
    }),

    adaptiveParams: Joi.object({
      userPastPerformance: Joi.object({
        averageScore: Joi.number()
        .min(0)
        .max(100)
        .required()
        .messages({
          'number.base': 'Average score must be a number',
          'number.min': 'Average score cannot be negative',
          'number.max': 'Average score cannot exceed 100',
          'any.required': 'Average score is required in user past performance'
        }),

        totalQuizzes: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
          'number.base': 'Total quizzes must be a number',
          'number.integer': 'Total quizzes must be an integer',
          'number.min': 'Total quizzes cannot be negative',
          'any.required': 'Total quizzes is required in user past performance'
        }),

        strongSubjects: Joi.array()
        .items(Joi.string().trim().max(100))
        .optional()
        .messages({
          'array.base': 'Strong subjects must be an array'
        }),

        weakSubjects: Joi.array()
        .items(Joi.string().trim().max(100))
        .optional()
        .messages({
          'array.base': 'Weak subjects must be an array'
        }),

        recentPerformance: Joi.array()
        .items(
            Joi.object({
              score: Joi.number().min(0).max(100).optional(),
              date: Joi.date().optional(),
              subject: Joi.string().trim().max(100).optional()
            })
        )
        .optional()
        .messages({
          'array.base': 'Recent performance must be an array'
        })
      }).optional(),

      difficultyDistribution: Joi.object({
        easy: Joi.number()
        .min(0)
        .max(100)
        .required()
        .messages({
          'number.base': 'Easy percentage must be a number',
          'number.min': 'Easy percentage cannot be negative',
          'number.max': 'Easy percentage cannot exceed 100',
          'any.required': 'Easy percentage is required in difficulty distribution'
        }),

        medium: Joi.number()
        .min(0)
        .max(100)
        .required()
        .messages({
          'number.base': 'Medium percentage must be a number',
          'number.min': 'Medium percentage cannot be negative',
          'number.max': 'Medium percentage cannot exceed 100',
          'any.required': 'Medium percentage is required in difficulty distribution'
        }),

        hard: Joi.number()
        .min(0)
        .max(100)
        .required()
        .messages({
          'number.base': 'Hard percentage must be a number',
          'number.min': 'Hard percentage cannot be negative',
          'number.max': 'Hard percentage cannot exceed 100',
          'any.required': 'Hard percentage is required in difficulty distribution'
        })
      })
      .custom((value, helpers) => {
        const { easy, medium, hard } = value;
        const total = easy + medium + hard;

        if (Math.abs(total - 100) > 0.01) { // Allow small floating point errors
          return helpers.message({ custom: 'Difficulty distribution percentages must sum to 100' });
        }

        return value;
      }, 'Difficulty Distribution Validation')
      .optional()
    })
    .custom((value, helpers) => {
      // At least one of userPastPerformance or difficultyDistribution must be provided
      if (!value.userPastPerformance && !value.difficultyDistribution) {
        return helpers.message({
          custom: 'At least one of userPastPerformance or difficultyDistribution must be provided in adaptiveParams'
        });
      }

      return value;
    }, 'Adaptive Parameters Validation')
    .optional()
  })
};

export const adaptiveQuestionsSchema = {
  body: Joi.object({
    baseParams: Joi.object({
      grade: Joi.number().integer().min(1).max(12).required(),
      subject: Joi.string().trim().min(2).max(100).required(),
      totalQuestions: Joi.number().integer().min(1).max(50).required(),
      topics: Joi.array().items(Joi.string().trim().max(100)).optional(),
      difficulty: Joi.string().valid('easy', 'medium', 'hard', 'mixed').optional()
    }).required(),

    userPerformanceData: Joi.object({
      averageScore: Joi.number().min(0).max(100).required(),
      totalQuizzes: Joi.number().integer().min(0).required(),
      strongSubjects: Joi.array().items(Joi.string()).optional(),
      weakSubjects: Joi.array().items(Joi.string()).optional(),
      recentPerformance: Joi.array().optional(),
      subjectPerformance: Joi.object().optional(),
      difficultyPerformance: Joi.object().optional()
    }).required()
  })
};

export const generateHintSchema = {
  body: Joi.object({
    question: Joi.object({
      questionId: Joi.string()
        .trim()
        .min(1)
        .required()
        .messages({
          'string.min': 'Question ID cannot be empty',
          'any.required': 'Question ID is required'
        }),
      questionText: Joi.string()
        .trim()
        .min(10)
        .max(1000)
        .required()
        .messages({
          'string.min': 'Question text must be at least 10 characters',
          'string.max': 'Question text cannot exceed 1000 characters',
          'any.required': 'Question text is required'
        }),
      questionType: Joi.string()
        .valid('mcq', 'true_false')
        .required()
        .messages({
          'any.only': 'Question type must be mcq or true_false',
          'any.required': 'Question type is required'
        }),
      difficulty: Joi.string()
        .valid('easy', 'medium', 'hard')
        .required()
        .messages({
          'any.only': 'Difficulty must be easy, medium, or hard',
          'any.required': 'Difficulty is required'
        }),
      topic: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
          'string.min': 'Topic must be at least 2 characters',
          'string.max': 'Topic cannot exceed 100 characters',
          'any.required': 'Topic is required'
        }),
      options: Joi.array()
        .items(Joi.string().trim().min(1))
        .optional()
        .messages({
          'array.base': 'Options must be an array'
        }),
      correctAnswer: Joi.string()
        .trim()
        .optional()
    }).required()
  })
};

export const realTimeAdjustmentSchema = {
  body: Joi.object({
    currentAnswers: Joi.array()
      .items(
        Joi.object({
          questionId: Joi.string().required(),
          userAnswer: Joi.string().required(),
          isCorrect: Joi.boolean().required(),
          pointsEarned: Joi.number().min(0).required(),
          timeSpent: Joi.number().min(0).required(),
          hintsUsed: Joi.number().min(0).default(0)
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
      .min(1)
      .max(50)
      .required()
      .messages({
        'number.min': 'At least 1 question must remain',
        'number.max': 'Cannot exceed 50 remaining questions',
        'any.required': 'Remaining questions count is required'
      }),

    currentDifficulty: Joi.string()
      .valid('easy', 'medium', 'hard')
      .required()
      .messages({
        'any.only': 'Current difficulty must be easy, medium, or hard',
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
      .integer()
      .min(0)
      .optional()
      .messages({
        'number.min': 'Time remaining cannot be negative'
      })
  })
};
