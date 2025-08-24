export const sanitizeQuestionsForClient = (questions: any[], includeAnswers: boolean = false) => {
  return questions.map(q => ({
    questionId: q.questionId,
    questionText: q.questionText,
    questionType: q.questionType,
    options: q.options || [],
    difficulty: q.difficulty,
    points: q.points || 1,
    topic: q.topic,
    hints: q.hints || [],
    // SECURITY: Never expose correct answer or explanation during quiz
    ...(includeAnswers && {
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    })
  }));
};