// Helper utility functions for submission comparison and analysis

export class SubmissionAnalytics {
  /**
   * Calculate consistency score for user attempts
   */
  static calculateConsistencyScore(attempts: any[]): number {
    if (attempts.length < 2) return 100;
    
    const scores = attempts.map(attempt => attempt.scoring.scorePercentage);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert to consistency score (0-100, where 100 is perfectly consistent)
    return Math.max(0, 100 - (standardDeviation / mean) * 100);
  }

  /**
   * Compare grades and return numeric difference
   */
  static compareGrades(newGrade: string, oldGrade: string): number {
    const gradeValues = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
    return gradeValues[newGrade as keyof typeof gradeValues] - gradeValues[oldGrade as keyof typeof gradeValues];
  }

  /**
   * Compare question answers between two attempts
   */
  static compareQuestionAnswers(answers1: any[], answers2: any[]): any {
    const comparison = {
      totalQuestions: Math.max(answers1.length, answers2.length),
      improved: 0,
      worsened: 0,
      unchanged: 0,
      details: [] as any[]
    };

    const questionMap1 = new Map(answers1.map(ans => [ans.questionId, ans]));
    const questionMap2 = new Map(answers2.map(ans => [ans.questionId, ans]));

    // Compare each question
    for (const [questionId, answer2] of questionMap2) {
      const answer1 = questionMap1.get(questionId);
      if (answer1) {
        const status = answer1.isCorrect === answer2.isCorrect ? 'unchanged' :
                      answer2.isCorrect ? 'improved' : 'worsened';
        
        comparison[status as keyof typeof comparison]++;
        comparison.details.push({
          questionId,
          attempt1: {
            answer: answer1.userAnswer,
            correct: answer1.isCorrect,
            points: answer1.pointsEarned,
            timeSpent: answer1.timeSpent
          },
          attempt2: {
            answer: answer2.userAnswer,
            correct: answer2.isCorrect,
            points: answer2.pointsEarned,
            timeSpent: answer2.timeSpent
          },
          status
        });
      }
    }

    return comparison;
  }

  /**
   * Calculate improvement trend from score progression
   */
  static calculateImprovementTrend(attempts: any[]): number {
    if (attempts.length < 2) return 0;

    const sortedAttempts = attempts.sort((a, b) => a.attemptNumber - b.attemptNumber);
    const scores = sortedAttempts.map(attempt => attempt.scoring.scorePercentage);
    
    // Simple linear trend calculation
    const n = scores.length;
    const sumX = n * (n + 1) / 2; // Sum of 1,2,3...n
    const sumY = scores.reduce((sum, score) => sum + score, 0);
    const sumXY = scores.reduce((sum, score, index) => sum + score * (index + 1), 0);
    const sumX2 = n * (n + 1) * (2 * n + 1) / 6; // Sum of 1²,2²,3²...n²

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope; // Positive = improving, Negative = declining
  }

  /**
   * Get performance insights based on attempt history
   */
  static generatePerformanceInsights(attempts: any[]): any {
    if (attempts.length === 0) return null;

    const sortedAttempts = attempts.sort((a, b) => a.attemptNumber - b.attemptNumber);
    const latestAttempt = sortedAttempts[sortedAttempts.length - 1];
    const firstAttempt = sortedAttempts[0];

    const insights = {
      totalAttempts: attempts.length,
      firstScore: firstAttempt.scoring.scorePercentage,
      latestScore: latestAttempt.scoring.scorePercentage,
      bestScore: Math.max(...attempts.map(a => a.scoring.scorePercentage)),
      averageScore: attempts.reduce((sum, a) => sum + a.scoring.scorePercentage, 0) / attempts.length,
      improvementTrend: this.calculateImprovementTrend(attempts),
      consistencyScore: this.calculateConsistencyScore(attempts),
      totalTimeSpent: attempts.reduce((sum, a) => sum + a.timing.totalTimeSpent, 0),
      averageTimePerAttempt: attempts.reduce((sum, a) => sum + a.timing.totalTimeSpent, 0) / attempts.length
    };

    // Generate textual insights
    const textualInsights: string[] = [];

    if (insights.improvementTrend > 5) {
      textualInsights.push("📈 Strong improvement trend - you're getting better with each attempt!");
    } else if (insights.improvementTrend < -5) {
      textualInsights.push("📉 Scores declining - consider reviewing the material before next attempt");
    } else {
      textualInsights.push("➡️ Stable performance across attempts");
    }

    if (insights.consistencyScore > 80) {
      textualInsights.push("🎯 Very consistent performance - you have solid understanding");
    } else if (insights.consistencyScore < 50) {
      textualInsights.push("📊 Variable performance - focus on consistent preparation");
    }

    if (insights.latestScore > insights.bestScore - 5) {
      textualInsights.push("🏆 Recent performance is near your best - great job!");
    }

    if (insights.totalAttempts >= 3 && insights.latestScore < insights.averageScore) {
      textualInsights.push("💡 Latest score below average - try taking a break before next attempt");
    }

    return {
      ...insights,
      textualInsights
    };
  }
}
