import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
} from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const auth = await requirePermission(request, "ASSIGN_FOUNDER_TASKS");
    if (auth instanceof Response) return auth;

    const departments = await prisma.department.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    const coverage = await Promise.all(
      departments.map(async (dept) => {
        const [publishedChapters, publishedSops, publishedCourses, openTasks, latestChapter] =
          await Promise.all([
            prisma.knowledgeChapter.count({
              where: { departmentId: dept.id, status: "PUBLISHED" },
            }),
            prisma.sOP.count({
              where: { departmentId: dept.id, status: "PUBLISHED" },
            }),
            prisma.course.count({
              where: { departmentId: dept.id, status: "PUBLISHED" },
            }),
            prisma.departmentTask.count({
              where: {
                departmentId: dept.id,
                status: { in: ["ASSIGNED", "IN_PROGRESS"] },
              },
            }),
            prisma.knowledgeChapter.findFirst({
              where: { departmentId: dept.id, status: "PUBLISHED" },
              orderBy: { publishedAt: "desc" },
              select: { title: true, publishedAt: true },
            }),
          ]);

        const memberCount = await prisma.user.count({
          where: { departmentId: dept.id, status: "ACTIVE" },
        });

        return {
          id: dept.id,
          name: dept.name,
          memberCount,
          publishedChapters,
          publishedSops,
          publishedCourses,
          openTasks,
          latestChapter: latestChapter
            ? {
                title: latestChapter.title,
                publishedAt: latestChapter.publishedAt,
              }
            : null,
        };
      })
    );

    const totals = {
      departments: departments.length,
      publishedChapters: coverage.reduce((s, d) => s + d.publishedChapters, 0),
      openTasks: coverage.reduce((s, d) => s + d.openTasks, 0),
      members: coverage.reduce((s, d) => s + d.memberCount, 0),
    };

    return apiSuccess({ totals, coverage });
  } catch (error) {
    return handleApiError(error);
  }
}
