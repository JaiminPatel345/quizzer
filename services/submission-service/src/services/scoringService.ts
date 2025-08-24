import { logger } from '../utils/logger.js';
import type { QuizQuestion, SubmissionAnswer } from '../types/index.js';

export class ScoringService {

  static calculateScore(
      questions: QuizQuestion[],
      userAnswers: { questionId: string; userAnswer: string; timeSpent: number; hintsUsed: number }[]
  ): SubmissionAnswer[] {
    const evaluatedAnswers: SubmissionAnswer[] = [];

    for (const userAnswer of userAnswers) {
      const question = questions.find(q => q.questionId === userAnswer.questionId);

      if (!question) {
        logger.warn('Question not found for answer:', { questionId: userAnswer.questionId });
        continue;
      }

      const isCorrect = this.checkAnswer(question, userAnswer.userAnswer);
      let pointsEarned = isCorrect ? question.points : 0;

      // Apply hint penalty (reduce points by 10% for each hint used)
      if (userAnswer.hintsUsed > 0) {
        const hintPenalty = Math.min(userAnswer.hintsUsed * 0.1, 0.5); // Max 50% penalty
        pointsEarned = Math.round(pointsEarned * (1 - hintPenalty));
      }

      evaluatedAnswers.push({
        questionId: userAnswer.questionId,
        userAnswer: userAnswer.userAnswer,
        isCorrect,
        pointsEarned,
        timeSpent: userAnswer.timeSpent,
        hintsUsed: userAnswer.hintsUsed
      });
    }

    return evaluatedAnswers;
  }

  private static checkAnswer(question: QuizQuestion, userAnswer: string): boolean {
    if (!question.correctAnswer) {
      throw new Error(`Question ${question.questionId} is missing correct answer. This indicates an issue with quiz data retrieval.`);
    }
    
    const correctAnswer = question.correctAnswer.toLowerCase().trim();
    const userAnswerNormalized = userAnswer.toLowerCase().trim();

    switch (question.questionType) {
      case 'mcq':
        return correctAnswer === userAnswerNormalized;

      case 'true_false':
        return correctAnswer === userAnswerNormalized;

      case 'short_answer':
        // For short answers, allow some flexibility
        return this.fuzzyMatch(correctAnswer, userAnswerNormalized);

      default:
        return false;
    }
  }

  private static fuzzyMatch(correct: string, user: string): boolean {
    // Exact match
    if (correct === user) return true;

    // Remove common words and punctuation for comparison
    const cleanCorrect = this.cleanAnswer(correct);
    const cleanUser = this.cleanAnswer(user);

    // Check if user answer contains all key words from correct answer
    const correctWords = cleanCorrect.split(' ').filter(word => word.length > 2);
    const userWords = cleanUser.split(' ');

    if (correctWords.length === 0) return cleanCorrect === cleanUser;

    const matchedWords = correctWords.filter(word =>
        userWords.some(userWord => userWord.includes(word) || word.includes(userWord))
    );

    // Consider correct if at least 70% of key words match
    return matchedWords.length >= Math.ceil(correctWords.length * 0.7);
  }

  private static cleanAnswer(answer: string): string {
    return answer
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\b/g, '') // Remove common words
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
  }

  static calculateGrade(scorePercentage: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (scorePercentage >= 90) return 'A';
    if (scorePercentage >= 80) return 'B';
    if (scorePercentage >= 70) return 'C';
    if (scorePercentage >= 60) return 'D';
    return 'F';
  }

  static calculateStatistics(answers: SubmissionAnswer[]) {
    const totalQuestions = answers.length;
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const totalPoints = answers.reduce((sum, a) => sum + a.pointsEarned, 0);
    const maxPossiblePoints = answers.reduce((sum, a) => sum + (a.isCorrect ? a.pointsEarned : a.pointsEarned + 1), 0);
    const scorePercentage = Math.round((correctAnswers / totalQuestions) * 100);

    return {
      totalQuestions,
      correctAnswers,
      totalPoints,
      scorePercentage,
      grade: this.calculateGrade(scorePercentage)
    };
  }
}
