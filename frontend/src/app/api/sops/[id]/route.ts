import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
  createAuditLog,
} from "@/lib/api-helpers";
import { getContentManager, canAccessDepartment } from "@/lib/content";
import { updateSOPSchema } from "@/lib/validations";

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
    const sop = await prisma.sOP.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        departmentId: true,
        effectiveDate: true,
        reviewDate: true,
        status: true,
        department: { select: { id: true, name: true } },
        attachments: {
          select: { id: true, originalName: true, mimeType: true, size: true, url: true },
        },
      },
    });

    if (!sop) return apiError("SOP not found", 404);
    if (!canAccessDepartment(ctx, sop.departmentId)) {
      return apiError("Forbidden", 403);
    }

    return apiSuccess(sop);
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
    const existing = await prisma.sOP.findUnique({ where: { id } });
    if (!existing) return apiError("SOP not found", 404);
    if (!canAccessDepartment(ctx, existing.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const data = updateSOPSchema.parse(body);

    if (data.departmentId && !canAccessDepartment(ctx, data.departmentId)) {
      return apiError("You can only assign content to your department", 403);
    }

    const status = data.status ?? existing.status;

    const sop = await prisma.sOP.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
        ...(data.effectiveDate && { effectiveDate: new Date(data.effectiveDate) }),
        ...(data.reviewDate !== undefined && {
          reviewDate: data.reviewDate ? new Date(data.reviewDate) : null,
        }),
        status,
        approvalStatus: status === "PUBLISHED" ? "APPROVED" : existing.approvalStatus,
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
      entityType: "SOP",
      entityId: sop.id,
    });

    return apiSuccess(sop);
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
    const existing = await prisma.sOP.findUnique({ where: { id } });
    if (!existing) return apiError("SOP not found", 404);
    if (!canAccessDepartment(ctx, existing.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const sop = await prisma.sOP.update({
      where: { id },
      data: { status: "ARCHIVED" },
      select: { id: true, title: true },
    });

    await createAuditLog({
      userId: ctx.userId,
      action: "ARCHIVE",
      entityType: "SOP",
      entityId: sop.id,
    });

    return apiSuccess(sop);
  } catch (error) {
    return handleApiError(error);
  }
}
