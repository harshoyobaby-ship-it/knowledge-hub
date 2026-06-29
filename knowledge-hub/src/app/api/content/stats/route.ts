import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
  requirePermission,
  createAuditLog,
} from "@/lib/api-helpers";
import { getContentManager } from "@/lib/content";

export async function GET(request: Request) {
  try {
    const auth = await requirePermission(request, "MANAGE_CONTENT");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const deptFilter = ctx.canManageAll ? {} : { departmentId: ctx.departmentId! };

    const [chapters, sops, quizzes] = await Promise.all([
      prisma.knowledgeChapter.groupBy({
        by: ["status"],
        where: { ...deptFilter },
        _count: true,
      }),
      prisma.sOP.groupBy({
        by: ["status"],
        where: { ...deptFilter },
        _count: true,
      }),
      prisma.quiz.groupBy({
        by: ["status"],
        where: { ...deptFilter },
        _count: true,
      }),
    ]);

    const countByStatus = (
      groups: { status: string; _count: number }[]
    ) => ({
      total: groups.reduce((s, g) => s + g._count, 0),
      draft: groups.find((g) => g.status === "DRAFT")?._count ?? 0,
      published: groups.find((g) => g.status === "PUBLISHED")?._count ?? 0,
      archived: groups.find((g) => g.status === "ARCHIVED")?._count ?? 0,
    });

    return apiSuccess({
      chapters: countByStatus(chapters),
      sops: countByStatus(sops),
      quizzes: countByStatus(quizzes),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
