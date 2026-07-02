import { apiError, apiSuccess, handleApiError, requirePermission } from "@/lib/api-helpers";
import { getTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ragJson } from "@/lib/rag-client";

type BulkSyncItem = {
  source_type: string;
  source_id: string;
  title: string;
  text: string;
  department_id?: string | null;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, "MANAGE_RAG");
    if (auth instanceof Response) return auth;

    const token = await getTokenFromRequest(request);
    if (!token) return apiError("Unauthorized", 401);

    const [chapters, sops, courses] = await Promise.all([
      prisma.knowledgeChapter.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, title: true, description: true, content: true, departmentId: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.sOP.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, title: true, departmentId: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.course.findMany({
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          description: true,
          departmentId: true,
          updatedAt: true,
          modules: {
            select: {
              id: true,
              title: true,
              lessons: { select: { id: true, title: true, content: true }, orderBy: { order: "asc" } },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const items: BulkSyncItem[] = [];

    for (const ch of chapters) {
      items.push({
        source_type: "chapter",
        source_id: ch.id,
        title: ch.title,
        text: [ch.title, ch.description ?? "", ch.content ?? ""].filter(Boolean).join("\n\n"),
        department_id: ch.departmentId,
        metadata: { updated_at: ch.updatedAt.toISOString() },
      });
    }

    // SOP content is mostly file-based; we still index title + a pointer.
    for (const sop of sops) {
      items.push({
        source_type: "sop",
        source_id: sop.id,
        title: sop.title,
        text: `SOP: ${sop.title}\nOpen in Knowledge Hub: /sops/${sop.id}`,
        department_id: sop.departmentId,
        metadata: { updated_at: sop.updatedAt.toISOString() },
      });
    }

    for (const course of courses) {
      const lessonText = course.modules
        .flatMap((m) => m.lessons.map((l) => `Module: ${m.title}\nLesson: ${l.title}\n${l.content ?? ""}`))
        .join("\n\n---\n\n");

      items.push({
        source_type: "course",
        source_id: course.id,
        title: course.title,
        text: [course.title, course.description ?? "", lessonText].filter(Boolean).join("\n\n"),
        department_id: course.departmentId,
        metadata: { updated_at: course.updatedAt.toISOString() },
      });
    }

    // Chunking + embeddings happen inside the RAG service.
    const result = await ragJson<{ upserted_chunks: number; items_processed: number }>(
      "/api/v1/sync/bulk",
      token,
      {
        method: "POST",
        body: JSON.stringify({ items }),
      }
    );

    return apiSuccess({
      ...result,
      totals: { chapters: chapters.length, sops: sops.length, courses: courses.length },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

