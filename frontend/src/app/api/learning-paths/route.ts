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
  getContentManager,
  canAccessDepartment,
  departmentFilter,
} from "@/lib/content";
import { getLearnerContentFilter } from "@/lib/department-access";
import { learningPathSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const manage = searchParams.get("manage") === "true";
    const statusParam = searchParams.get("status");

    let where: Record<string, unknown> = {};
    if (manage) {
      const perm = await requirePermission(request, "MANAGE_LEARNING_PATHS");
      if (perm instanceof Response) return perm;
      const ctx = await getContentManager(perm);
      if (!ctx) return apiError("Forbidden", 403);
      where = { ...departmentFilter(ctx) };
      if (statusParam && statusParam !== "all") {
        where.status = statusParam;
      }
    } else {
      where = {
        status: "PUBLISHED",
        ...(await getLearnerContentFilter(auth)),
      };
    }

    const [paths, total] = await Promise.all([
      prisma.learningPath.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          durationDays: true,
          passingScore: true,
          status: true,
          autoEnroll: true,
          department: { select: { id: true, name: true } },
          _count: { select: { items: true, enrollments: true } },
        },
        orderBy: manage ? { updatedAt: "desc" } : { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.learningPath.count({ where }),
    ]);

    let enrollmentMap = new Map<string, { progress: number; completedAt: Date | null }>();
    if (!manage && paths.length > 0) {
      const enrollments = await prisma.learningPathEnrollment.findMany({
        where: {
          userId: auth.userId,
          learningPathId: { in: paths.map((p) => p.id) },
        },
        select: { learningPathId: true, progress: true, completedAt: true },
      });
      enrollmentMap = new Map(
        enrollments.map((e) => [e.learningPathId, { progress: e.progress, completedAt: e.completedAt }])
      );
    }

    const data = paths.map(({ _count, ...p }) => ({
      ...p,
      itemCount: _count.items,
      enrollmentCount: _count.enrollments,
      enrollment: enrollmentMap.get(p.id) ?? null,
    }));

    return apiSuccess({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, "MANAGE_LEARNING_PATHS");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const body = await request.json();
    const data = learningPathSchema.parse(body);

    if (data.departmentId && !canAccessDepartment(ctx, data.departmentId)) {
      return apiError("You can only create paths for your department", 403);
    }

    const path = await prisma.learningPath.create({
      data: {
        name: data.name,
        description: data.description,
        durationDays: data.durationDays ?? 7,
        departmentId: data.departmentId,
        passingScore: data.passingScore ?? 70,
        autoEnroll: data.autoEnroll ?? false,
        status: data.status ?? "DRAFT",
      },
      select: { id: true, name: true, status: true },
    });

    await createAuditLog({
      userId: ctx.userId,
      action: "CREATE",
      entityType: "LearningPath",
      entityId: path.id,
    });

    return apiSuccess(path, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
