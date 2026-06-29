import { prisma } from "@/lib/prisma";
import {
  createToken,
  setAuthCookie,
  verifyPassword,
} from "@/lib/auth";
import {
  apiSuccess,
  apiError,
  handleApiError,
  createAuditLog,
} from "@/lib/api-helpers";
import { loginSchema } from "@/lib/validations";
import { isDatabaseConfigured, databaseUnavailableMessage } from "@/lib/db";
import {
  canBypassDepartmentFilter,
  requiresDepartmentAssignment,
  getUserAssignedDepartments,
  validateSelectedDepartment,
} from "@/lib/department-access";

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return apiError(databaseUnavailableMessage(), 503);
    }

    const body = await request.json();
    const { email, password, departmentId } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      return apiError("Invalid email or password", 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return apiError("Invalid email or password", 401);
    }

    const assignedDepartments = await getUserAssignedDepartments(user);

    if (requiresDepartmentAssignment(user.role)) {
      if (assignedDepartments.length === 0) {
        return apiError(
          "No department assigned to your account. Please contact your administrator.",
          403
        );
      }

      if (!departmentId) {
        return apiSuccess({
          requiresDepartment: true,
          departments: assignedDepartments,
          user: {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        });
      }

      const deptError = validateSelectedDepartment(user.departmentId, departmentId);
      if (deptError) {
        return apiError(deptError, 403);
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const sessionDepartmentId = canBypassDepartmentFilter(user.role)
      ? null
      : user.departmentId;

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      departmentId: sessionDepartmentId,
    });

    await setAuthCookie(token);

    await createAuditLog({
      userId: user.id,
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
      details: {
        departmentId: sessionDepartmentId,
        departmentName: user.department?.name,
      },
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return apiSuccess({
      requiresDepartment: false,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        department: user.department,
        departmentId: sessionDepartmentId,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
