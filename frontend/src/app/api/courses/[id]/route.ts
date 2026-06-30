import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
  requirePermission,
  createAuditLog,
} from "@/lib/api-helpers";
import { getCourseManager, canAccessCourseDepartment, computeCourseProgress } from "@/lib/courses";
import { canAccessDepartmentContent } from "@/lib/department-access";
import { updateCourseSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        author: { select: { firstName: true, lastName: true } },
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              include: {
                resources: true,
                progress: {
                  where: { userId: auth.userId },
                  select: { completed: true, completedAt: true },
                },
              },
            },
          },
        },
        enrollments: {
          where: { userId: auth.userId },
          take: 1,
        },
      },
    });

    if (!course) return apiError("Course not found", 404);

    if (course.status !== "PUBLISHED") {
      const perm = await requirePermission(request, "MANAGE_COURSES");
      if (perm instanceof Response) return perm;
      const ctx = await getCourseManager(perm);
      if (!ctx || !canAccessCourseDepartment(ctx, course.departmentId)) {
        return apiError("Forbidden", 403);
      }
    } else if (!(await canAccessDepartmentContent(auth, course.departmentId))) {
      return apiError("This course is not available for your department", 403);
    }

    const myProgress = await computeCourseProgress(auth.userId, id);

    return apiSuccess({
      ...course,
      enrolled: course.enrollments.length > 0,
      myProgress,
      enrollment: course.enrollments[0] ?? null,
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
    const auth = await requirePermission(request, "MANAGE_COURSES");
    if (auth instanceof Response) return auth;

    const ctx = await getCourseManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { id } = await params;
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) return apiError("Course not found", 404);
    if (!canAccessCourseDepartment(ctx, existing.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const data = updateCourseSchema.parse(body);

    if (data.departmentId !== undefined && !canAccessCourseDepartment(ctx, data.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const status = data.status ?? existing.status;
    const publishedAt =
      status === "PUBLISHED" && existing.status !== "PUBLISHED"
        ? new Date()
        : existing.publishedAt;

    const course = await prisma.course.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.thumbnail !== undefined && { thumbnail: data.thumbnail }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
        ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
        ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
        ...(data.isSelfPaced !== undefined && { isSelfPaced: data.isSelfPaced }),
        status,
        publishedAt,
      },
    });

    await createAuditLog({
      userId: ctx.userId,
      action: "UPDATE",
      entityType: "Course",
      entityId: course.id,
    });

    return apiSuccess(course);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_COURSES");
    if (auth instanceof Response) return auth;

    const ctx = await getCourseManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { id } = await params;
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) return apiError("Course not found", 404);
    if (!canAccessCourseDepartment(ctx, existing.departmentId)) {
      return apiError("Forbidden", 403);
    }

    await prisma.course.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    await createAuditLog({
      userId: ctx.userId,
      action: "ARCHIVE",
      entityType: "Course",
      entityId: id,
    });

    return apiSuccess({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
