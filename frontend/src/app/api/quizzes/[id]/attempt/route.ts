import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
} from "@/lib/api-helpers";
import { canAccessDepartmentContent } from "@/lib/department-access";
import { markLearningComplete } from "@/lib/insights";
import { scoreQuizAttempt } from "@/lib/quiz-scoring";
import { z } from "zod";

const submitSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  timeSpentSeconds: z.number().int().min(0).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          select: {
            id: true,
            type: true,
            correctAnswer: true,
            points: true,
          },
        },
      },
    });

    if (!quiz) return apiError("Quiz not found", 404);
    if (quiz.status !== "PUBLISHED") {
      return apiError("Quiz is not available", 400);
    }
    if (!(await canAccessDepartmentContent(auth, quiz.departmentId))) {
      return apiError("Forbidden", 403);
    }

    const attemptCount = await prisma.quizAttempt.count({
      where: { quizId: id, userId: auth.userId },
    });

    if (attemptCount >= quiz.maxAttempts) {
      return apiError(`Maximum attempts (${quiz.maxAttempts}) reached`, 400);
    }

    const body = await request.json();
    const { answers, timeSpentSeconds } = submitSchema.parse(body);

    const result = scoreQuizAttempt(quiz.questions, answers);
    const passed = !result.needsReview && result.score >= quiz.passingPercentage;

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: id,
        userId: auth.userId,
        answers: answers as Prisma.InputJsonValue,
        score: result.needsReview ? null : result.score,
        passed: result.needsReview ? null : passed,
        needsReview: result.needsReview,
        completedAt: new Date(),
        timeSpentSeconds,
      },
      select: {
        id: true,
        score: true,
        passed: true,
        needsReview: true,
        completedAt: true,
      },
    });

    if (passed) {
      await markLearningComplete({
        userId: auth.userId,
        type: "QUIZ",
        quizId: id,
        score: result.score,
        timeSpentMinutes: timeSpentSeconds
          ? Math.ceil(timeSpentSeconds / 60)
          : undefined,
      });
    }

    return apiSuccess({
      ...attempt,
      passingPercentage: quiz.passingPercentage,
      earnedPoints: result.earnedPoints,
      totalPoints: result.totalPoints,
      attemptsRemaining: Math.max(0, quiz.maxAttempts - attemptCount - 1),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
