export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "SINGLE_CHOICE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER";

export interface ScorableQuestion {
  id: string;
  type: QuestionType;
  correctAnswer: unknown;
  points: number;
}

function normalizeStrings(values: unknown[]): string[] {
  return values.map(String).sort();
}

export function isAnswerCorrect(
  type: QuestionType,
  correctAnswer: unknown,
  userAnswer: unknown
): boolean {
  switch (type) {
    case "SINGLE_CHOICE":
    case "SHORT_ANSWER":
      return String(userAnswer ?? "") === String(correctAnswer ?? "");
    case "TRUE_FALSE":
      return userAnswer === correctAnswer;
    case "MULTIPLE_CHOICE": {
      if (!Array.isArray(correctAnswer) || !Array.isArray(userAnswer)) return false;
      const a = normalizeStrings(correctAnswer);
      const b = normalizeStrings(userAnswer);
      return a.length === b.length && a.every((v, i) => v === b[i]);
    }
    default:
      return false;
  }
}

export function scoreQuizAttempt(
  questions: ScorableQuestion[],
  answers: Record<string, unknown>
): { score: number; passed: boolean; needsReview: boolean; earnedPoints: number; totalPoints: number } {
  let earnedPoints = 0;
  let totalPoints = 0;
  let needsReview = false;

  for (const q of questions) {
    totalPoints += q.points;
    const userAnswer = answers[q.id];

    if (q.type === "SHORT_ANSWER") {
      needsReview = true;
      continue;
    }

    if (userAnswer === undefined || userAnswer === null || userAnswer === "") {
      continue;
    }

    if (isAnswerCorrect(q.type, q.correctAnswer, userAnswer)) {
      earnedPoints += q.points;
    }
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 1000) / 10 : 0;

  return {
    score,
    passed: false,
    needsReview,
    earnedPoints,
    totalPoints,
  };
}

export function stripQuestionAnswers<T extends { correctAnswer?: unknown; explanation?: string | null }>(
  questions: T[]
): Omit<T, "correctAnswer" | "explanation">[] {
  return questions.map(({ correctAnswer: _c, explanation: _e, ...rest }) => rest);
}
