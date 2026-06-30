import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
} from "@/lib/api-helpers";
import { syncEnrollmentProgress } from "@/lib/courses";
import { ProgressType } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const auth = await requirePermission(request, "ENROLL_COURSES");
    if (auth instanceof Response) return auth;

    const { lessonId } = await params;
    const body = await request.json().catch(() => ({}));
    const timeSpentMinutes = typeof body.timeSpentMinutes === "number" ? body.timeSpentMinutes : 0;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });
    if (!lesson || lesson.module.course.status !== "PUBLISHED") {
      return apiError("Lesson not found", 404);
    }

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: auth.userId,
          courseId: lesson.module.courseId,
        },
      },
    });
    if (!enrollment) {
      return apiError("Enroll in the course first", 400);
    }

    const progress = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: auth.userId, lessonId } },
      create: {
        userId: auth.userId,
        lessonId,
        completed: true,
        completedAt: new Date(),
        timeSpentMinutes,
      },
      update: {
        completed: true,
        completedAt: new Date(),
        timeSpentMinutes,
      },
    });

    const existing = await prisma.progress.findFirst({
      where: { userId: auth.userId, lessonId, type: ProgressType.LESSON },
    });
    if (existing) {
      await prisma.progress.update({
        where: { id: existing.id },
        data: { completed: true, completedAt: new Date(), timeSpentMinutes },
      });
    } else {
      await prisma.progress.create({
        data: {
          userId: auth.userId,
          type: ProgressType.LESSON,
          lessonId,
          courseId: lesson.module.courseId,
          completed: true,
          completedAt: new Date(),
          timeSpentMinutes,
        },
      });
    }

    await syncEnrollmentProgress(auth.userId, lesson.module.courseId);

    return apiSuccess(progress);
  } catch (error) {
    return handleApiError(error);
  }
}
