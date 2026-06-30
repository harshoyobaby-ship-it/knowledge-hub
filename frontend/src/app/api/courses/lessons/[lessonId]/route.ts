import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
} from "@/lib/api-helpers";
import { getCourseManager, canAccessCourseDepartment } from "@/lib/courses";
import { lessonSchema } from "@/lib/validations";

async function getLessonWithCourse(lessonId: string) {
  return prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } }, resources: true },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_COURSES");
    if (auth instanceof Response) return auth;

    const ctx = await getCourseManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { lessonId } = await params;
    const lesson = await getLessonWithCourse(lessonId);
    if (!lesson) return apiError("Lesson not found", 404);
    if (!canAccessCourseDepartment(ctx, lesson.module.course.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const data = lessonSchema.parse(body);

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.contentType !== undefined && { contentType: data.contentType }),
        ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
        ...(data.order !== undefined && { order: data.order }),
      },
      include: { resources: true },
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_COURSES");
    if (auth instanceof Response) return auth;

    const ctx = await getCourseManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { lessonId } = await params;
    const lesson = await getLessonWithCourse(lessonId);
    if (!lesson) return apiError("Lesson not found", 404);
    if (!canAccessCourseDepartment(ctx, lesson.module.course.departmentId)) {
      return apiError("Forbidden", 403);
    }

    await prisma.lesson.delete({ where: { id: lessonId } });
    return apiSuccess({ id: lessonId });
  } catch (error) {
    return handleApiError(error);
  }
}
