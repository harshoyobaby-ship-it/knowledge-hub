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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_COURSES");
    if (auth instanceof Response) return auth;

    const ctx = await getCourseManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { id: courseId } = await params;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return apiError("Course not found", 404);
    if (!canAccessCourseDepartment(ctx, course.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const data = moduleSchema.parse(body);

    const maxOrder = await prisma.courseModule.aggregate({
      where: { courseId },
      _max: { order: true },
    });
    const order = data.order ?? (maxOrder._max.order ?? -1) + 1;

    const mod = await prisma.courseModule.create({
      data: {
        courseId,
        title: data.title,
        description: data.description,
        order,
      },
    });

    await createAuditLog({
      userId: ctx.userId,
      action: "CREATE",
      entityType: "CourseModule",
      entityId: mod.id,
    });

    return apiSuccess(mod, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
