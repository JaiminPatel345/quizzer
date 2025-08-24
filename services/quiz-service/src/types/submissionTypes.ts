interface SubmissionAnswer {
  questionId: string;
  userAnswer: string;
  timeSpent: number;
  hintsUsed: number;
  isCorrect?: boolean;
  pointsEarned?: number;
}

interface SubmissionScoring {
  totalQuestions: number;
  correctAnswers: number;
  totalPoints: number;
  scorePercentage: number;
  grade: string;
}

interface SubmissionTiming {
  startedAt: string; // ISO Date string
  submittedAt: string; // ISO Date string
  totalTimeSpent: number; // seconds
}

interface AI_Evaluation {
  model: string;
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
  evaluatedAt?: string;
}

interface SubmissionMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
}

interface SubmissionData {
  _id: string;
  quizId: string;
  userId: string;
  attemptNumber: number;
  answers: SubmissionAnswer[];
  scoring: SubmissionScoring;
  timing: SubmissionTiming;
  aiEvaluation?: AI_Evaluation;
  metadata: SubmissionMetadata;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface QuizData {
  _id: string;
  title: string;
  metadata: any;
}

interface SubmissionResults {
  score: number;
  grade: string;
  correctAnswers: number;
  totalQuestions: number;
  totalTimeSpent: number;
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
  aiModel?: string;
}

export interface SubmissionResponse {
  success: boolean;
  message: string;
  data: {
    submission: SubmissionData;
    quiz: QuizData;
    results: SubmissionResults;
    analytics: {
      updated: boolean;
      message: string;
    };
    emailSent?: boolean;
  };
}
