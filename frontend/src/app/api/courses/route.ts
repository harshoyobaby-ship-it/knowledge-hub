import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
  requirePermission,
  parsePagination,
  createAuditLog,
} from "@/lib/api-helpers";
import {
  getCourseManager,
  canAccessCourseDepartment,
  departmentCourseFilter,
  getLearnerCourseFilter,
  courseSelect,
} from "@/lib/courses";
import { courseSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get("search")?.trim() || "";
    const manage = searchParams.get("manage") === "true";
    const statusParam = searchParams.get("status");
    const enrolledOnly = searchParams.get("enrolled") === "true";

    let where: Record<string, unknown> = {};

    if (manage) {
      const perm = await requirePermission(request, "MANAGE_COURSES");
      if (perm instanceof Response) return perm;
      const ctx = await getCourseManager(perm);
      if (!ctx) return apiError("Forbidden", 403);
      where = { ...departmentCourseFilter(ctx) };
      if (statusParam && statusParam !== "all") {
        where.status = statusParam;
      }
    } else {
      where = await getLearnerCourseFilter(auth);
    }

    if (search) {
      where = {
        AND: [
          where,
          {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          },
        ],
      };
    }

    if (enrolledOnly) {
      where.enrollments = { some: { userId: auth.userId } };
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        select: {
          ...courseSelect,
          enrollments: {
            where: { userId: auth.userId },
            select: { progress: true, completedAt: true },
            take: 1,
          },
        },
        orderBy: manage ? { updatedAt: "desc" } : { title: "asc" },
        skip,
        take: limit,
      }),
      prisma.course.count({ where }),
    ]);

    const data = courses.map(({ enrollments, _count, ...c }) => ({
      ...c,
      moduleCount: _count.modules,
      enrollmentCount: _count.enrollments,
      myProgress: enrollments[0]?.progress ?? null,
      myCompleted: !!enrollments[0]?.completedAt,
    }));

    return apiSuccess({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, "MANAGE_COURSES");
    if (auth instanceof Response) return auth;

    const ctx = await getCourseManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const body = await request.json();
    const data = courseSchema.parse(body);

    if (!canAccessCourseDepartment(ctx, data.departmentId)) {
      return apiError("You can only create courses for your department", 403);
    }

    const status = data.status ?? "DRAFT";

    const course = await prisma.course.create({
      data: {
        title: data.title,
        description: data.description,
        thumbnail: data.thumbnail,
        departmentId: data.departmentId ?? null,
        difficulty: data.difficulty ?? "BEGINNER",
        estimatedHours: data.estimatedHours ?? 1,
        status,
        isSelfPaced: data.isSelfPaced ?? true,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        authorId: ctx.userId,
      },
      select: courseSelect,
    });

    await createAuditLog({
      userId: ctx.userId,
      action: "CREATE",
      entityType: "Course",
      entityId: course.id,
    });

    return apiSuccess(course, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
