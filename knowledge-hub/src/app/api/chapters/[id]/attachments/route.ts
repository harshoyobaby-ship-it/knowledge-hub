import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
} from "@/lib/api-helpers";
import { getContentManager, canAccessDepartment } from "@/lib/content";
import { z } from "zod";

const attachmentSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
  url: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_CONTENT");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { id } = await params;
    const chapter = await prisma.knowledgeChapter.findUnique({ where: { id } });
    if (!chapter) return apiError("Chapter not found", 404);
    if (!canAccessDepartment(ctx, chapter.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const data = attachmentSchema.parse(body);

    const attachment = await prisma.attachment.create({
      data: { ...data, chapterId: id },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        size: true,
        url: true,
        createdAt: true,
      },
    });

    return apiSuccess(attachment, 201);
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
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("attachmentId");
    if (!attachmentId) return apiError("attachmentId required", 400);

    const chapter = await prisma.knowledgeChapter.findUnique({ where: { id } });
    if (!chapter) return apiError("Chapter not found", 404);
    if (!canAccessDepartment(ctx, chapter.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, chapterId: id },
    });
    if (!attachment) return apiError("Attachment not found", 404);

    await prisma.attachment.delete({ where: { id: attachmentId } });
    return apiSuccess({ id: attachmentId });
  } catch (error) {
    return handleApiError(error);
  }
}
