import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
  parsePagination,
} from "@/lib/api-helpers";
import { getContentManager, canAccessDepartment } from "@/lib/content";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_CONTENT");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { id } = await params;
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        passingPercentage: true,
        maxAttempts: true,
        departmentId: true,
        department: { select: { name: true } },
        _count: { select: { questions: true } },
      },
    });

    if (!quiz) return apiError("Quiz not found", 404);
    if (!canAccessDepartment(ctx, quiz.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const [attempts, total] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { quizId: id },
        select: {
          id: true,
          score: true,
          passed: true,
          needsReview: true,
          startedAt: true,
          completedAt: true,
          timeSpentSeconds: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { completedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.quizAttempt.count({ where: { quizId: id } }),
    ]);

    const passedCount = await prisma.quizAttempt.count({
      where: { quizId: id, passed: true },
    });

    const { _count, ...quizInfo } = quiz;

    return apiSuccess({
      quiz: {
        ...quizInfo,
        questionCount: _count.questions,
      },
      summary: {
        totalAttempts: total,
        passedCount,
        passRate: total > 0 ? Math.round((passedCount / total) * 100) : 0,
      },
      data: attempts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
