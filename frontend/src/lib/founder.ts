import { UserRole } from "@prisma/client";
import type { JWTPayload } from "./auth";
import { hasPermission } from "./rbac";

export function isFounderRole(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

export function isSuperAdminRole(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN;
}

export function isFounder(auth: JWTPayload | null): boolean {
  if (!auth) return false;
  return hasPermission(auth, "ASSIGN_FOUNDER_TASKS");
}

export function homePathForRole(role: UserRole): string {
  if (role === UserRole.SUPER_ADMIN) return "/admin";
  if (role === UserRole.ADMIN) return "/founder";
  if (role === UserRole.HR) return "/hr";
  if (role === UserRole.MANAGER || role === UserRole.DEPARTMENT_HEAD) return "/manager";
  return "/dashboard";
}
