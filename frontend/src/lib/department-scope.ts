import { UserRole } from "@prisma/client";
import type { AuthUser } from "@/hooks/use-auth";

const DEPARTMENT_SCOPED_ROLES: UserRole[] = [
  UserRole.MANAGER,
  UserRole.DEPARTMENT_HEAD,
  UserRole.TRAINER,
];

export interface ScopedDepartment {
  id: string;
  name: string | null;
}

/** Managers/trainers are locked to their own department for content and team tasks. */
export function getScopedDepartment(user: AuthUser | null): ScopedDepartment | null {
  if (!user?.departmentId) return null;
  if (!DEPARTMENT_SCOPED_ROLES.includes(user.role)) return null;
  return {
    id: user.departmentId,
    name: user.department?.name ?? null,
  };
}

export function filterDepartmentsForUser<T extends { id: string; name: string }>(
  departments: T[],
  scoped: ScopedDepartment | null
): T[] {
  if (!scoped) return departments;
  const match = departments.filter((d) => d.id === scoped.id);
  if (match.length) return match;
  if (scoped.name) return [{ id: scoped.id, name: scoped.name } as T];
  return [{ id: scoped.id, name: "Your department" } as T];
}

export function resolveDepartmentName(
  departmentId: string,
  departments: { id: string; name: string }[],
  fallbackName?: string | null
): string {
  return (
    fallbackName ??
    departments.find((d) => d.id === departmentId)?.name ??
    "Your department"
  );
}
