import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAnyPermission,
} from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const auth = await requireAnyPermission(request, [
      "ACCESS_ADMIN_PANEL",
      "ACCESS_SUPER_ADMIN_PANEL",
    ]);
    if (auth instanceof Response) return auth;

    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      totalDepartments,
      totalCourses,
      totalChapters,
      totalSOPs,
      totalQuizzes,
      totalLearningPaths,
      completedProgress,
      totalProgress,
      quizAttempts,
      passedAttempts,
      ragDocuments,
      auditLogsToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.department.count({ where: { status: "ACTIVE" } }),
      prisma.course.count(),
      prisma.knowledgeChapter.count(),
      prisma.sOP.count(),
      prisma.quiz.count(),
      prisma.learningPath.count(),
      prisma.progress.count({ where: { completed: true } }),
      prisma.progress.count(),
      prisma.quizAttempt.count(),
      prisma.quizAttempt.count({ where: { passed: true } }),
      prisma.ragDocument.count(),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    const completionRate =
      totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : 0;
    const quizPassRate =
      quizAttempts > 0 ? Math.round((passedAttempts / quizAttempts) * 100) : 0;

    return apiSuccess({
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      totalDepartments,
      totalCourses,
      totalChapters,
      totalSOPs,
      totalQuizzes,
      totalLearningPaths,
      completionRate,
      quizAttempts,
      quizPassRate,
      ragDocuments,
      auditLogsToday,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
