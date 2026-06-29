import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
  createAuditLog,
} from "@/lib/api-helpers";
import { getCourseManager, canAccessCourseDepartment } from "@/lib/courses";
import { moduleSchema } from "@/lib/validations";

async function getModuleWithCourse(moduleId: string) {
  return prisma.courseModule.findUnique({
    where: { id: moduleId },
    include: { course: true },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_COURSES");
    if (auth instanceof Response) return auth;

    const ctx = await getCourseManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { moduleId } = await params;
    const mod = await getModuleWithCourse(moduleId);
    if (!mod) return apiError("Module not found", 404);
    if (!canAccessCourseDepartment(ctx, mod.course.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const data = moduleSchema.parse(body);

    const updated = await prisma.courseModule.update({
      where: { id: moduleId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_COURSES");
    if (auth instanceof Response) return auth;

    const ctx = await getCourseManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { moduleId } = await params;
    const mod = await getModuleWithCourse(moduleId);
    if (!mod) return apiError("Module not found", 404);
    if (!canAccessCourseDepartment(ctx, mod.course.departmentId)) {
      return apiError("Forbidden", 403);
    }

    await prisma.courseModule.delete({ where: { id: moduleId } });

    await createAuditLog({
      userId: ctx.userId,
      action: "DELETE",
      entityType: "CourseModule",
      entityId: moduleId,
    });

    return apiSuccess({ id: moduleId });
  } catch (error) {
    return handleApiError(error);
  }
}
