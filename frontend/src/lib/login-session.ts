import { UserRole } from "@prisma/client";
import { createToken, setAuthCookie } from "@/lib/auth";
import { createAuditLog } from "@/lib/api-helpers";
import {
  canBypassDepartmentFilter,
  getUserAssignedDepartments,
  requiresDepartmentAssignment,
} from "@/lib/department-access";
import { homePathForRole } from "@/lib/founder";
import { prisma } from "@/lib/prisma";

type LoginUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar: string | null;
  departmentId: string | null;
  department: { id: string; name: string } | null;
};

export async function establishLoginSession(params: {
  user: LoginUser;
  departmentId?: string;
  ipAddress?: string;
  method: "password" | "google";
  avatarUrl?: string | null;
}): Promise<{ redirectTo: string } | { requiresDepartment: true; departments: { id: string; name: string }[] }> {
  const { user, departmentId, ipAddress, method, avatarUrl } = params;

  if (requiresDepartmentAssignment(user.role)) {
    const departments = await getUserAssignedDepartments(user);
    if (departments.length === 0) {
      throw new Error("No department assigned to your account. Please contact your administrator.");
    }

    const resolvedDepartmentId = departmentId ?? (departments.length === 1 ? departments[0].id : undefined);
    if (!resolvedDepartmentId) {
      return { requiresDepartment: true, departments };
    }

    const mismatch =
      user.departmentId && resolvedDepartmentId !== user.departmentId;
    if (mismatch) {
      throw new Error("Selected department does not match your assigned department.");
    }
  }

  const sessionDepartmentId = canBypassDepartmentFilter(user.role) ? null : user.departmentId;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      ...(avatarUrl && !user.avatar ? { avatar: avatarUrl } : {}),
    },
  });

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
      method,
      departmentId: sessionDepartmentId,
      departmentName: user.department?.name,
    },
    ipAddress,
  });

  return { redirectTo: homePathForRole(user.role) };
}
