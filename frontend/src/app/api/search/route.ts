import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
} from "@/lib/api-helpers";
import { getLearnerContentFilter } from "@/lib/department-access";
import { hasPermission } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    if (!hasPermission(auth, "VIEW_LEARNING_CONTENT")) {
      return apiError("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) {
      return apiSuccess({ results: [], query });
    }

    const deptFilter = await getLearnerContentFilter(auth);
    const contains = { contains: query, mode: "insensitive" as const };

    const [chapters, sops, quizzes] = await Promise.all([
      prisma.knowledgeChapter.findMany({
        where: {
          status: "PUBLISHED",
          ...(deptFilter as { departmentId?: string }),
          OR: [
            { title: contains },
            { category: contains },
            { description: contains },
            { founderNotes: contains },
          ],
        },
        select: {
          id: true,
          title: true,
          category: true,
          department: { select: { name: true } },
        },
        take: 15,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.sOP.findMany({
        where: {
          status: "PUBLISHED",
          ...(deptFilter as { departmentId?: string }),
          OR: [
            { title: contains },
            { fileName: contains },
          ],
        },
        select: {
          id: true,
          title: true,
          fileName: true,
          department: { select: { name: true } },
        },
        take: 15,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.quiz.findMany({
        where: {
          status: "PUBLISHED",
          ...(deptFilter as object),
          OR: [{ title: contains }, { description: contains }],
        },
        select: {
          id: true,
          title: true,
          department: { select: { name: true } },
        },
        take: 15,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const results = [
      ...chapters.map((c) => ({
        type: "Chapter" as const,
        title: c.title,
        meta: `${c.department.name}${c.category ? ` · ${c.category}` : ""}`,
        href: `/learning-modules/${c.id}`,
      })),
      ...sops.map((s) => ({
        type: "SOP" as const,
        title: s.title,
        meta: `${s.department.name}${s.fileName ? ` · ${s.fileName}` : ""}`,
        href: `/sops/${s.id}`,
      })),
      ...quizzes.map((q) => ({
        type: "Quiz" as const,
        title: q.title,
        meta: q.department?.name ?? "All departments",
        href: `/quizzes/${q.id}`,
      })),
    ];

    return apiSuccess({ results, query });
  } catch (error) {
    return handleApiError(error);
  }
}
