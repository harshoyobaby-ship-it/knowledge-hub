import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
} from "@/lib/api-helpers";
import { canAccessDepartmentContent } from "@/lib/department-access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;

    const path = await prisma.learningPath.findUnique({ where: { id } });
    if (!path) return apiError("Learning path not found", 404);
    if (path.status !== "PUBLISHED") return apiError("Path not available", 400);
    if (!(await canAccessDepartmentContent(auth, path.departmentId))) {
      return apiError("Forbidden", 403);
    }

    const existing = await prisma.learningPathEnrollment.findUnique({
      where: { userId_learningPathId: { userId: auth.userId, learningPathId: id } },
    });
    if (existing) return apiSuccess(existing);

    const enrollment = await prisma.learningPathEnrollment.create({
      data: {
        userId: auth.userId,
        learningPathId: id,
      },
    });

    return apiSuccess(enrollment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
