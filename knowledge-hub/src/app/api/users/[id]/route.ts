import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
  createAuditLog,
} from "@/lib/api-helpers";
import { updateUserSchema } from "@/lib/validations";
import {
  userSelect,
  canAssignRole,
  canManageUser,
  hashUserPassword,
} from "@/lib/users";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_USERS");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) return apiError("User not found", 404);
    if (!canManageUser(auth, user.role)) {
      return apiError("Forbidden", 403);
    }

    return apiSuccess(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_USERS");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return apiError("User not found", 404);
    if (!canManageUser(auth, existing.role)) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const data = updateUserSchema.parse(body);

    if (data.role && !canAssignRole(auth, data.role)) {
      return apiError("You cannot assign this role", 403);
    }

    if (data.email && data.email.toLowerCase() !== existing.email) {
      const duplicate = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (duplicate) return apiError("Email already in use", 409);
    }

    const updateData: Record<string, unknown> = {
      ...(data.email && { email: data.email.toLowerCase() }),
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.role && { role: data.role }),
      ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
      ...(data.jobTitle !== undefined && { jobTitle: data.jobTitle }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.status && { status: data.status }),
    };

    if (data.password) {
      updateData.passwordHash = await hashUserPassword(data.password);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: userSelect,
    });

    await createAuditLog({
      userId: auth.userId,
      action: "UPDATE",
      entityType: "User",
      entityId: user.id,
      details: { email: user.email },
    });

    return apiSuccess(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_USERS");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    if (id === auth.userId) {
      return apiError("You cannot deactivate your own account", 400);
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return apiError("User not found", 404);
    if (!canManageUser(auth, existing.role)) {
      return apiError("Forbidden", 403);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status: "INACTIVE" },
      select: userSelect,
    });

    await createAuditLog({
      userId: auth.userId,
      action: "DELETE",
      entityType: "User",
      entityId: user.id,
      details: { action: "deactivated" },
    });

    return apiSuccess({ message: "User deactivated", user });
  } catch (error) {
    return handleApiError(error);
  }
}
