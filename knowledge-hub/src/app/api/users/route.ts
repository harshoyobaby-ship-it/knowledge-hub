import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
  parsePagination,
  createAuditLog,
} from "@/lib/api-helpers";
import { createUserSchema } from "@/lib/validations";
import {
  userSelect,
  canAssignRole,
  hashUserPassword,
} from "@/lib/users";
import { UserRole } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = await requirePermission(request, "MANAGE_USERS");
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(request.url);
    const { page, limit, sortBy, sortOrder, skip } = parsePagination(searchParams);
    const search = searchParams.get("search")?.trim() || "";
    const role = searchParams.get("role") as UserRole | null;
    const departmentId = searchParams.get("departmentId");
    const status = searchParams.get("status");

    const where = {
      ...(search && {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(role && { role }),
      ...(departmentId && { departmentId }),
      ...(status && { status: status as "ACTIVE" | "INACTIVE" | "SUSPENDED" }),
    };

    const orderBy = { [sortBy]: sortOrder } as Record<string, "asc" | "desc">;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userSelect,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return apiSuccess({
      data: users,
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
    const auth = await requirePermission(request, "MANAGE_USERS");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const data = createUserSchema.parse(body);

    if (!canAssignRole(auth, data.role)) {
      return apiError("You cannot assign this role", 403);
    }

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) {
      return apiError("A user with this email already exists", 409);
    }

    const passwordHash = await hashUserPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        departmentId: data.departmentId || null,
        jobTitle: data.jobTitle || null,
        phone: data.phone || null,
        status: data.status || "ACTIVE",
      },
      select: userSelect,
    });

    await createAuditLog({
      userId: auth.userId,
      action: "CREATE",
      entityType: "User",
      entityId: user.id,
      details: { email: user.email, role: user.role },
    });

    return apiSuccess(user, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
