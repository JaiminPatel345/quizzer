import { logger } from './logger.js';

export type ValidQuestionType = 'mcq' | 'true_false';

export class QuestionTypeNormalizer {
  private static readonly TYPE_MAP: Record<string, ValidQuestionType> = {
    // MCQ variations
    'mcq': 'mcq',
    'multiple_choice': 'mcq',
    'multiplechoice': 'mcq',
    'multiple-choice': 'mcq',
    'multiplychoice': 'mcq',
    'multi_choice': 'mcq',
    'choice': 'mcq',

    // True/False variations
    'true_false': 'true_false',
    'truefalse': 'true_false',
    'true/false': 'true_false',
    'true-false': 'true_false',
    'tf': 'true_false',
    't_f': 'true_false',
    'boolean': 'true_false',
    'yes_no': 'true_false',
    'yesno': 'true_false'
  };

  static isValidQuestionType(type: string): type is ValidQuestionType {
    return ['mcq', 'true_false'].includes(type as ValidQuestionType);
  }

  static normalizeQuestionType(type: string): ValidQuestionType {
    if (!type || typeof type !== 'string') {
      logger.warn('Invalid question type provided, defaulting to mcq');
      return 'mcq';
    }

    const normalized = type.toLowerCase().trim().replace(/\s+/g, '_');
    const validType = this.TYPE_MAP[normalized];

    if (!validType) {
      logger.warn(`Unknown question type: "${type}", defaulting to mcq`);
      return 'mcq';
    }

    return validType;
  }

  static validateAndNormalizeQuestions<T extends { questionType: string }>(
      questions: T[]
  ): (Omit<T, 'questionType'> & { questionType: ValidQuestionType })[] {
    return questions.map(question => ({
      ...question,
      questionType: this.normalizeQuestionType(question.questionType)
    }));
  }
}