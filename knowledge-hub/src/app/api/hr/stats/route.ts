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
    const auth = await requirePermission(request, "ACCESS_HR_DASHBOARD");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const deptFilter = departmentFilter(ctx);
    const memberWhere =
      Object.keys(deptFilter).length > 0
        ? { departmentId: deptFilter.departmentId as string }
        : {};

    const [employeeCount, departments, progressByDept, overdueCount] = await Promise.all([
      prisma.user.count({
        where: {
          ...memberWhere,
          role: { in: [UserRole.EMPLOYEE, UserRole.STUDENT, UserRole.TRAINER] },
          status: "ACTIVE",
        },
      }),
      prisma.department.findMany({
        where: { status: "ACTIVE", ...(deptFilter.departmentId ? { id: deptFilter.departmentId as string } : {}) },
        select: {
          id: true,
          name: true,
          _count: { select: { members: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.progress.groupBy({
        by: ["userId"],
        where: { completed: true },
        _count: { id: true },
      }),
      prisma.learningPathEnrollment.count({
        where: {
          completedAt: null,
          startedAt: {
            lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const departmentDistribution = departments.map((d) => ({
      name: d.name,
      count: d._count.members,
    }));

    const topUsers = await prisma.user.findMany({
      where: { ...memberWhere, status: "ACTIVE" },
      select: {
        firstName: true,
        lastName: true,
        progress: { where: { completed: true }, select: { id: true } },
      },
      take: 50,
    });

    const topPerformers = topUsers
      .map((u) => ({
        name: `${u.firstName} ${u.lastName}`,
        progress: u.progress.length,
      }))
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5);

    const completionRates = await Promise.all(
      departments.map(async (d) => {
        const [completed, total] = await Promise.all([
          prisma.progress.count({
            where: {
              completed: true,
              user: { departmentId: d.id },
            },
          }),
          prisma.progress.count({
            where: { user: { departmentId: d.id } },
          }),
        ]);
        return {
          department: d.name,
          rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      })
    );

    return apiSuccess({
      employeeCount,
      departmentDistribution,
      completionRates,
      overdueLearning: overdueCount,
      topPerformers,
      activeLearners: progressByDept.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
