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
import { getUserCompletionMap } from "@/lib/insights";
import {
  getContentManager,
  canAccessDepartment,
  departmentFilter,
} from "@/lib/content";
import { getLearnerContentFilter } from "@/lib/department-access";
import { chapterSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get("search")?.trim() || "";
    const departmentId = searchParams.get("departmentId");
    const manage = searchParams.get("manage") === "true";
    const statusParam = searchParams.get("status");

    let statusFilter: "DRAFT" | "PUBLISHED" | "ARCHIVED" | undefined;
    let deptScope: { departmentId?: string } = {};

    if (manage) {
      const perm = await requirePermission(request, "MANAGE_CONTENT");
      if (perm instanceof Response) return perm;
      const ctx = await getContentManager(perm);
      if (!ctx) return apiError("Forbidden", 403);
      deptScope = departmentFilter(ctx);
      if (statusParam && statusParam !== "all") {
        statusFilter = statusParam as "DRAFT" | "PUBLISHED" | "ARCHIVED";
      }
    } else {
      statusFilter = "PUBLISHED";
      const learnerFilter = await getLearnerContentFilter(auth);
      deptScope = learnerFilter as { departmentId?: string };
    }

    const where = {
      ...deptScope,
      ...(statusFilter && { status: statusFilter }),
      ...(departmentId && { departmentId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { category: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [chapters, total] = await Promise.all([
      prisma.knowledgeChapter.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          difficulty: true,
          estimatedMinutes: true,
          status: true,
          publishedAt: true,
          updatedAt: true,
          createdAt: true,
          department: { select: { id: true, name: true } },
          author: { select: { firstName: true, lastName: true } },
        },
        orderBy: manage ? { updatedAt: "desc" } : { title: "asc" },
        skip,
        take: limit,
      }),
      prisma.knowledgeChapter.count({ where }),
    ]);

    const completion =
      !manage && auth.userId !== "demo-user"
        ? await getUserCompletionMap(auth.userId)
        : { chapters: new Set<string>(), sops: new Set(), quizzes: new Set() };

    const data = chapters.map((ch) => ({
      ...ch,
      completed: completion.chapters.has(ch.id),
    }));

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
    const data = chapterSchema.parse(body);

    if (!canAccessDepartment(ctx, data.departmentId)) {
      return apiError("You can only create content for your department", 403);
    }

    const status = data.status ?? "DRAFT";

    const chapter = await prisma.knowledgeChapter.create({
      data: {
        title: data.title,
        description: data.description,
        departmentId: data.departmentId,
        category: data.category,
        difficulty: data.difficulty ?? "BEGINNER",
        estimatedMinutes: data.estimatedMinutes ?? 30,
        content: data.content,
        founderNotes: data.founderNotes,
        references: data.references ?? [],
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
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
      entityType: "KnowledgeChapter",
      entityId: chapter.id,
      details: { title: chapter.title },
    });

    return apiSuccess(chapter, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
