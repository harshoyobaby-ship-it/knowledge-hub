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
import { createSOPSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get("search")?.trim() || "";
    const statusParam = searchParams.get("status");
    const manage = searchParams.get("manage") === "true";

    let where: Record<string, unknown> = {};

    if (manage) {
      const perm = await requirePermission(request, "MANAGE_CONTENT");
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

    if (search) {
      where.title = { contains: search, mode: "insensitive" as const };
    }

    const selectFields = {
      id: true,
      title: true,
      version: true,
      status: true,
      approvalStatus: true,
      effectiveDate: true,
      reviewDate: true,
      updatedAt: true,
      department: { select: { id: true, name: true } },
      ...(manage && {
        owner: { select: { firstName: true, lastName: true } },
      }),
      ...(!manage && {
        attachments: { select: { id: true, originalName: true, url: true, mimeType: true } },
      }),
    } as const;

    const [sops, total] = await Promise.all([
      prisma.sOP.findMany({
        where,
        select: selectFields,
        orderBy: manage ? { updatedAt: "desc" } : { title: "asc" },
        skip,
        take: limit,
      }),
      prisma.sOP.count({ where }),
    ]);

    return apiSuccess({
      data: sops,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, "MANAGE_CONTENT");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const body = await request.json();
    const data = createSOPSchema.parse(body);

    if (!canAccessDepartment(ctx, data.departmentId)) {
      return apiError("You can only create content for your department", 403);
    }

    const status = data.status ?? "DRAFT";

    const sop = await prisma.sOP.create({
      data: {
        title: data.title,
        departmentId: data.departmentId,
        ownerId: ctx.userId,
        effectiveDate: new Date(data.effectiveDate),
        reviewDate: data.reviewDate ? new Date(data.reviewDate) : null,
        status,
        approvalStatus: status === "PUBLISHED" ? "APPROVED" : "DRAFT",
      },
      select: {
        id: true,
        title: true,
        status: true,
        department: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      userId: ctx.userId,
      action: "CREATE",
      entityType: "SOP",
      entityId: sop.id,
      details: { title: sop.title },
    });

    return apiSuccess(sop, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
