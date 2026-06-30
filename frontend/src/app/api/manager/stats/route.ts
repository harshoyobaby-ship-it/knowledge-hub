import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
} from "@/lib/api-helpers";
import { getContentManager, departmentFilter } from "@/lib/content";

export async function GET(request: Request) {
  try {
    const auth = await requirePermission(request, "VIEW_TEAM_PROGRESS");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("No department assigned to your manager account", 403);

    const deptFilter = departmentFilter(ctx);
    const departmentId = deptFilter.departmentId as string | undefined;

    if (!departmentId && !ctx.canManageAll) {
      return apiError("No department assigned to your manager account", 403);
    }

    const memberWhere = departmentId ? { departmentId } : {};

    const [employeeCount, department, progressByDept, overdueCount] = await Promise.all([
      prisma.user.count({
        where: {
          ...memberWhere,
          role: { in: [UserRole.EMPLOYEE, UserRole.STUDENT, UserRole.TRAINER] },
          status: "ACTIVE",
        },
      }),
      departmentId
        ? prisma.department.findUnique({
            where: { id: departmentId },
            select: { id: true, name: true },
          })
        : null,
      prisma.progress.groupBy({
        by: ["userId"],
        where: {
          completed: true,
          user: memberWhere,
        },
        _count: { id: true },
      }),
      prisma.learningPathEnrollment.count({
        where: {
          completedAt: null,
          startedAt: {
            lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          },
          user: memberWhere,
        },
      }),
    ]);

    const topUsers = await prisma.user.findMany({
      where: {
        ...memberWhere,
        status: "ACTIVE",
        role: { in: [UserRole.EMPLOYEE, UserRole.STUDENT, UserRole.TRAINER] },
      },
      select: {
        firstName: true,
        lastName: true,
        progress: { where: { completed: true }, select: { id: true } },
      },
      take: 20,
    });

    const topPerformers = topUsers
      .map((u) => ({
        name: `${u.firstName} ${u.lastName}`,
        progress: u.progress.length,
      }))
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5);

    let completionRate = 0;
    if (departmentId) {
      const [completed, total] = await Promise.all([
        prisma.progress.count({
          where: { completed: true, user: { departmentId } },
        }),
        prisma.progress.count({
          where: { user: { departmentId } },
        }),
      ]);
      completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    return apiSuccess({
      department,
      employeeCount,
      activeLearners: progressByDept.length,
      overdueLearning: overdueCount,
      completionRate,
      topPerformers,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
