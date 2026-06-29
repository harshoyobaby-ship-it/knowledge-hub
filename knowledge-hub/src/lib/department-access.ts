import { UserRole } from "@prisma/client";
import type { JWTPayload } from "./auth";
import { prisma } from "./prisma";

const BYPASS_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.HR];

const DEPARTMENT_SCOPED_ROLES: UserRole[] = [
  UserRole.EMPLOYEE,
  UserRole.STUDENT,
  UserRole.DEPARTMENT_HEAD,
];

export function canBypassDepartmentFilter(role: UserRole): boolean {
  return BYPASS_ROLES.includes(role);
}

export function requiresDepartmentAssignment(role: UserRole): boolean {
  return DEPARTMENT_SCOPED_ROLES.includes(role);
}

export interface AssignedDepartment {
  id: string;
  name: string;
}

export async function getUserAssignedDepartments(user: {
  departmentId: string | null;
  department?: { id: string; name: string } | null;
}): Promise<AssignedDepartment[]> {
  if (!user.departmentId) return [];
  if (user.department) {
    return [{ id: user.department.id, name: user.department.name }];
  }
  const dept = await prisma.department.findUnique({
    where: { id: user.departmentId },
    select: { id: true, name: true },
  });
  return dept ? [dept] : [];
}

export function validateSelectedDepartment(
  userDepartmentId: string | null,
  selectedDepartmentId: string | undefined
): string | null {
  if (!userDepartmentId) {
    return "No department assigned. Please contact your administrator.";
  }
  if (!selectedDepartmentId) {
    return "Please select your department to continue.";
  }
  if (selectedDepartmentId !== userDepartmentId) {
    return "Selected department does not match your assigned department.";
  }
  return null;
}

/** Strict learner filter — only content for the user's department */
export function getDepartmentContentFilter(auth: JWTPayload): Record<string, unknown> {
  if (canBypassDepartmentFilter(auth.role)) {
    return {};
  }
  if (!auth.departmentId) {
    return { id: "__no_department_access__" };
  }
  return { departmentId: auth.departmentId };
}

export async function resolveAuthDepartment(
  auth: JWTPayload
): Promise<string | null> {
  if (canBypassDepartmentFilter(auth.role)) return null;
  if (auth.departmentId) return auth.departmentId;
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { departmentId: true },
  });
  return user?.departmentId ?? null;
}

export async function getLearnerContentFilter(
  auth: JWTPayload
): Promise<Record<string, unknown>> {
  if (canBypassDepartmentFilter(auth.role)) {
    return {};
  }
  const departmentId = await resolveAuthDepartment(auth);
  if (!departmentId) {
    return { id: "__no_department_access__" };
  }
  return { departmentId };
}

export async function canAccessDepartmentContent(
  auth: JWTPayload,
  contentDepartmentId: string | null | undefined
): Promise<boolean> {
  if (canBypassDepartmentFilter(auth.role)) return true;
  if (!contentDepartmentId) return false;
  const userDept = await resolveAuthDepartment(auth);
  return userDept === contentDepartmentId;
}
