import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
  requirePermission,
  parsePagination,
  createAuditLog,
} from "@/lib/api-helpers";
import {
  getContentManager,
  canAccessDepartment,
  departmentFilter,
} from "@/lib/content";
import { getLearnerContentFilter } from "@/lib/department-access";
import { createQuizSchema } from "@/lib/validations";
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get("search")?.trim() || "";
    const statusParam = searchParams.get("status");
    const manage = searchParams.get("manage") === "true";

    let where: Record<string, unknown> = {};
    let statusFilter: "DRAFT" | "PUBLISHED" | "ARCHIVED" | undefined;

    if (manage) {
      const perm = await requirePermission(request, "MANAGE_CONTENT");
      if (perm instanceof Response) return perm;
      const ctx = await getContentManager(perm);
      if (!ctx) return apiError("Forbidden", 403);
      where = { ...departmentFilter(ctx) };
      if (statusParam && statusParam !== "all") {
        statusFilter = statusParam as "DRAFT" | "PUBLISHED" | "ARCHIVED";
      }
    } else {
      statusFilter = "PUBLISHED";
      const learnerFilter = await getLearnerContentFilter(auth);
      where = { ...learnerFilter };
    }

    const fullWhere = {
      ...where,
      ...(statusFilter && { status: statusFilter }),
      ...(search && {
        title: { contains: search, mode: "insensitive" as const },
      }),
    };

    const selectFields = {
      id: true,
      title: true,
      description: true,
      passingPercentage: true,
      maxAttempts: true,
      status: true,
      updatedAt: true,
      department: { select: { id: true, name: true } },
      _count: { select: { questions: true } },
      ...(manage && {
        author: { select: { firstName: true, lastName: true } },
      }),
    } as const;

    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where: fullWhere,
        select: selectFields,
        orderBy: manage ? { updatedAt: "desc" } : { title: "asc" },
        skip,
        take: limit,
      }),
      prisma.quiz.count({ where: fullWhere }),
    ]);

    let attemptStats: Map<
      string,
      { attemptCount: number; lastScore: number | null; bestScore: number | null }
    > = new Map();

    if (!manage && auth.userId !== "demo-user" && quizzes.length > 0) {
      const quizIds = quizzes.map((q) => q.id);
      const attempts = await prisma.quizAttempt.findMany({
        where: { userId: auth.userId, quizId: { in: quizIds } },
        select: { quizId: true, score: true },
        orderBy: { completedAt: "desc" },
      });

      for (const qid of quizIds) {
        const userAttempts = attempts.filter((a) => a.quizId === qid);
        const scores = userAttempts
          .map((a) => a.score)
          .filter((s): s is number => s != null);
        attemptStats.set(qid, {
          attemptCount: userAttempts.length,
          lastScore: scores[0] ?? null,
          bestScore: scores.length ? Math.max(...scores) : null,
        });
      }
    }

    const data = quizzes.map(({ _count, ...q }) => {
      const stats = attemptStats.get(q.id);
      return {
        ...q,
        questionCount: _count.questions,
        ...(stats && {
          attemptCount: stats.attemptCount,
          lastScore: stats.lastScore,
          bestScore: stats.bestScore,
          attemptsRemaining: Math.max(0, q.maxAttempts - stats.attemptCount),
        }),
      };
    });

    return apiSuccess({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, "MANAGE_CONTENT");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const body = await request.json();
    const data = createQuizSchema.parse(body);

    if (data.departmentId && !canAccessDepartment(ctx, data.departmentId)) {
      return apiError("You can only create content for your department", 403);
    }

    const status = data.status ?? "DRAFT";

    const quiz = await prisma.quiz.create({
      data: {
        title: data.title,
        description: data.description,
        departmentId: data.departmentId,
        passingPercentage: data.passingPercentage ?? 70,
        maxAttempts: data.maxAttempts ?? 3,
        timeLimitMinutes: data.timeLimitMinutes,
        certificateEligible: data.certificateEligible ?? false,
        status,
        authorId: ctx.userId,
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
      action: "CREATE",
      entityType: "Quiz",
      entityId: quiz.id,
      details: { title: quiz.title },
    });

    return apiSuccess(quiz, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
