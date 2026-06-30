import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
} from "@/lib/api-helpers";
import { getLearnerCourseFilter, syncEnrollmentProgress } from "@/lib/courses";
import { ProgressType } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "ENROLL_COURSES");
    if (auth instanceof Response) return auth;

    const { id: courseId } = await params;

    const filter = await getLearnerCourseFilter(auth);
    const course = await prisma.course.findFirst({
      where: { id: courseId, ...filter },
    });
    if (!course) return apiError("Course not available", 404);

    const enrollment = await prisma.courseEnrollment.upsert({
      where: { userId_courseId: { userId: auth.userId, courseId } },
      create: { userId: auth.userId, courseId },
      update: {},
    });

    return apiSuccess(enrollment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
