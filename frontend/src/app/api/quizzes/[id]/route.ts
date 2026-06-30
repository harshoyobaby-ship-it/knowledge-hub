import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
  requirePermission,
  createAuditLog,
} from "@/lib/api-helpers";
import { getContentManager, canAccessDepartment } from "@/lib/content";
import { canAccessDepartmentContent } from "@/lib/department-access";
import { hasPermission } from "@/lib/rbac";
import { stripQuestionAnswers } from "@/lib/quiz-scoring";
import { updateQuizSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const manage = searchParams.get("manage") === "true";

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        passingPercentage: true,
        maxAttempts: true,
        timeLimitMinutes: true,
        certificateEligible: true,
        status: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        questions: {
          select: {
            id: true,
            type: true,
            text: true,
            options: true,
            correctAnswer: true,
            points: true,
            order: true,
            explanation: true,
          },
          orderBy: { order: "asc" },
        },
        _count: { select: { questions: true } },
      },
    });

    if (!quiz) return apiError("Quiz not found", 404);

    if (manage) {
      const perm = await requirePermission(request, "MANAGE_CONTENT");
      if (perm instanceof Response) return perm;
      const ctx = await getContentManager(perm);
      if (!ctx || !canAccessDepartment(ctx, quiz.departmentId)) {
        return apiError("Forbidden", 403);
      }
    } else {
      if (quiz.status !== "PUBLISHED") {
        return apiError("Quiz not available", 404);
      }
      if (!(await canAccessDepartmentContent(auth, quiz.departmentId))) {
        return apiError("This quiz is not available for your department", 403);
      }
    }

    const attempts = manage
      ? undefined
      : await prisma.quizAttempt.findMany({
          where: { quizId: id, userId: auth.userId },
          select: { score: true, passed: true, completedAt: true },
          orderBy: { completedAt: "desc" },
        });

    const attemptCount = attempts?.length ?? 0;
    const lastAttempt = attempts?.[0];
    const bestScore = attempts?.reduce(
      (max, a) => (a.score != null && a.score > max ? a.score : max),
      0
    );

    const includeAnswers = manage || hasPermission(auth, "MANAGE_CONTENT");
    const questions = includeAnswers
      ? quiz.questions
      : stripQuestionAnswers(quiz.questions);

    const { _count, ...rest } = quiz;

    return apiSuccess({
      ...rest,
      questionCount: _count.questions,
      questions,
      attemptCount,
      lastScore: lastAttempt?.score ?? null,
      bestScore: bestScore ?? null,
      attemptsRemaining: Math.max(0, quiz.maxAttempts - attemptCount),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_CONTENT");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { id } = await params;
    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) return apiError("Quiz not found", 404);
    if (!canAccessDepartment(ctx, existing.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const data = updateQuizSchema.parse(body);

    if (data.departmentId && !canAccessDepartment(ctx, data.departmentId)) {
      return apiError("You can only assign content to your department", 403);
    }

    const quiz = await prisma.quiz.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
        ...(data.passingPercentage !== undefined && { passingPercentage: data.passingPercentage }),
        ...(data.maxAttempts !== undefined && { maxAttempts: data.maxAttempts }),
        ...(data.timeLimitMinutes !== undefined && { timeLimitMinutes: data.timeLimitMinutes }),
        ...(data.certificateEligible !== undefined && { certificateEligible: data.certificateEligible }),
        ...(data.status !== undefined && { status: data.status }),
      },
      select: {
        id: true,
        title: true,
        status: true,
        department: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      userId: ctx.userId,
      action: "UPDATE",
      entityType: "Quiz",
      entityId: quiz.id,
    });

    return apiSuccess(quiz);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_CONTENT");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { id } = await params;
    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) return apiError("Quiz not found", 404);
    if (!canAccessDepartment(ctx, existing.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const quiz = await prisma.quiz.update({
      where: { id },
      data: { status: "ARCHIVED" },
      select: { id: true, title: true },
    });

    await createAuditLog({
      userId: ctx.userId,
      action: "ARCHIVE",
      entityType: "Quiz",
      entityId: quiz.id,
    });

    return apiSuccess(quiz);
  } catch (error) {
    return handleApiError(error);
  }
}
