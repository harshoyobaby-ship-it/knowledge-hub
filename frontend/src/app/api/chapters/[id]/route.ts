import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
  requirePermission,
  createAuditLog,
} from "@/lib/api-helpers";
import { getUserCompletionMap } from "@/lib/insights";
import { getContentManager, canAccessDepartment } from "@/lib/content";
import { canAccessDepartmentContent } from "@/lib/department-access";
import { updateChapterSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    const chapter = await prisma.knowledgeChapter.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        founderNotes: true,
        category: true,
        difficulty: true,
        estimatedMinutes: true,
        status: true,
        version: true,
        departmentId: true,
        references: true,
        publishedAt: true,
        updatedAt: true,
        department: { select: { id: true, name: true } },
        author: { select: { firstName: true, lastName: true } },
        versions: {
          select: { version: true, changeNotes: true, createdAt: true },
          orderBy: { version: "desc" },
          take: 5,
        },
        attachments: {
          select: { id: true, originalName: true, mimeType: true, size: true, url: true },
        },
      },
    });

    if (!chapter) {
      return apiError("Chapter not found", 404);
    }

    if (chapter.status !== "PUBLISHED") {
      const perm = await requirePermission(request, "MANAGE_CONTENT");
      if (perm instanceof Response) return perm;
      const ctx = await getContentManager(perm);
      if (!ctx || !canAccessDepartment(ctx, chapter.departmentId)) {
        return apiError("Forbidden", 403);
      }
    } else if (!(await canAccessDepartmentContent(auth, chapter.departmentId))) {
      return apiError("This content is not available for your department", 403);
    }

    const completion =
      auth.userId !== "demo-user"
        ? await getUserCompletionMap(auth.userId)
        : { chapters: new Set<string>(), sops: new Set(), quizzes: new Set() };

    return apiSuccess({
      ...chapter,
      completed: completion.chapters.has(chapter.id),
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
    const existing = await prisma.knowledgeChapter.findUnique({ where: { id } });
    if (!existing) return apiError("Chapter not found", 404);
    if (!canAccessDepartment(ctx, existing.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const data = updateChapterSchema.parse(body);

    if (data.departmentId && !canAccessDepartment(ctx, data.departmentId)) {
      return apiError("You can only assign content to your department", 403);
    }

    const status = data.status ?? existing.status;
    const publishedAt =
      status === "PUBLISHED" && existing.status !== "PUBLISHED"
        ? new Date()
        : existing.publishedAt;

    const chapter = await prisma.knowledgeChapter.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
        ...(data.estimatedMinutes !== undefined && { estimatedMinutes: data.estimatedMinutes }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.founderNotes !== undefined && { founderNotes: data.founderNotes }),
        ...(data.references !== undefined && { references: data.references }),
        status,
        publishedAt,
        ...(data.content && data.content !== existing.content
          ? { version: existing.version + 1 }
          : {}),
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
      entityType: "KnowledgeChapter",
      entityId: chapter.id,
      details: { title: chapter.title, status: chapter.status },
    });

    return apiSuccess(chapter);
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
    const existing = await prisma.knowledgeChapter.findUnique({ where: { id } });
    if (!existing) return apiError("Chapter not found", 404);
    if (!canAccessDepartment(ctx, existing.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const chapter = await prisma.knowledgeChapter.update({
      where: { id },
      data: { status: "ARCHIVED" },
      select: { id: true, title: true },
    });

    await createAuditLog({
      userId: ctx.userId,
      action: "ARCHIVE",
      entityType: "KnowledgeChapter",
      entityId: chapter.id,
    });

    return apiSuccess(chapter);
  } catch (error) {
    return handleApiError(error);
  }
}
