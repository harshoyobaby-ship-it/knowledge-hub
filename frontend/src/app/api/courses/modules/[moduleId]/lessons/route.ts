import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
  createAuditLog,
} from "@/lib/api-helpers";
import { getCourseManager, canAccessCourseDepartment } from "@/lib/courses";
import { lessonSchema } from "@/lib/validations";
import { z } from "zod";

const resourceSchema = z.object({
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  url: z.string(),
  resourceType: z.enum(["TEXT", "VIDEO", "PDF", "DOCUMENT", "PPT"]),
});

const createLessonSchema = lessonSchema.extend({
  resources: z.array(resourceSchema).optional(),
});

async function getModuleWithCourse(moduleId: string) {
  return prisma.courseModule.findUnique({
    where: { id: moduleId },
    include: { course: true },
  });
}

export async function POST(
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
    const data = createLessonSchema.parse(body);

    const maxOrder = await prisma.lesson.aggregate({
      where: { moduleId },
      _max: { order: true },
    });
    const order = data.order ?? (maxOrder._max.order ?? -1) + 1;

    const lesson = await prisma.lesson.create({
      data: {
        moduleId,
        title: data.title,
        description: data.description,
        content: data.content,
        contentType: data.contentType ?? "TEXT",
        durationMinutes: data.durationMinutes ?? 10,
        order,
        resources: data.resources?.length
          ? { create: data.resources }
          : undefined,
      },
      include: { resources: true },
    });

    await createAuditLog({
      userId: ctx.userId,
      action: "CREATE",
      entityType: "Lesson",
      entityId: lesson.id,
    });

    return apiSuccess(lesson, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
