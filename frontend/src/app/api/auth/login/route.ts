import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import {
  apiSuccess,
  apiError,
  handleApiError,
} from "@/lib/api-helpers";
import { loginSchema } from "@/lib/validations";
import { isDatabaseConfigured, databaseUnavailableMessage } from "@/lib/db";
import {
  getUserAssignedDepartments,
  validateSelectedDepartment,
  requiresDepartmentAssignment,
} from "@/lib/department-access";
import { establishLoginSession } from "@/lib/login-session";

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

    if (requiresDepartmentAssignment(user.role)) {
      const assignedDepartments = await getUserAssignedDepartments(user);

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

    const result = await establishLoginSession({
      user,
      departmentId,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      method: "password",
    });

    if ("requiresDepartment" in result) {
      return apiSuccess({
        requiresDepartment: true,
        departments: result.departments,
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    }

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
        departmentId: user.departmentId,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
