import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
  requirePermission,
} from "@/lib/api-helpers";
import { getContentManager, canAccessDepartment } from "@/lib/content";
import { canAccessDepartmentContent } from "@/lib/department-access";
import { learningPathSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const manage = new URL(request.url).searchParams.get("manage") === "true";

    const path = await prisma.learningPath.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        items: {
          orderBy: { order: "asc" },
          include: {
            chapter: { select: { id: true, title: true } },
            course: { select: { id: true, title: true } },
            quiz: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!path) return apiError("Learning path not found", 404);

    if (manage) {
      const perm = await requirePermission(request, "MANAGE_LEARNING_PATHS");
      if (perm instanceof Response) return perm;
      const ctx = await getContentManager(perm);
      if (!ctx || !canAccessDepartment(ctx, path.departmentId)) {
        return apiError("Forbidden", 403);
      }
    } else {
      if (path.status !== "PUBLISHED") return apiError("Not available", 404);
      if (!(await canAccessDepartmentContent(auth, path.departmentId))) {
        return apiError("Forbidden", 403);
      }
    }

    const enrollment = await prisma.learningPathEnrollment.findUnique({
      where: { userId_learningPathId: { userId: auth.userId, learningPathId: id } },
    });

    return apiSuccess({ ...path, enrollment });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_LEARNING_PATHS");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { id } = await params;
    const existing = await prisma.learningPath.findUnique({ where: { id } });
    if (!existing) return apiError("Not found", 404);
    if (!canAccessDepartment(ctx, existing.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const data = learningPathSchema.partial().parse(await request.json());

    const path = await prisma.learningPath.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.durationDays !== undefined && { durationDays: data.durationDays }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
        ...(data.passingScore !== undefined && { passingScore: data.passingScore }),
        ...(data.autoEnroll !== undefined && { autoEnroll: data.autoEnroll }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    return apiSuccess(path);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_LEARNING_PATHS");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { id } = await params;
    const existing = await prisma.learningPath.findUnique({ where: { id } });
    if (!existing) return apiError("Not found", 404);
    if (!canAccessDepartment(ctx, existing.departmentId)) {
      return apiError("Forbidden", 403);
    }

    await prisma.learningPath.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return apiSuccess({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
