import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import type { JWTPayload } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export function canAssignRole(actor: JWTPayload, role: UserRole): boolean {
  if (actor.role === UserRole.SUPER_ADMIN) return true;
  if (actor.role === UserRole.ADMIN) {
    return role !== UserRole.SUPER_ADMIN;
  }
  if (actor.role === UserRole.HR) {
    const allowed: UserRole[] = [
      UserRole.EMPLOYEE,
      UserRole.STUDENT,
      UserRole.TRAINER,
      UserRole.MANAGER,
      UserRole.DEPARTMENT_HEAD,
      UserRole.HR,
      UserRole.GUEST,
    ];
    return allowed.includes(role);
  }
  return false;
}

export function canManageUser(actor: JWTPayload, targetRole: UserRole): boolean {
  if (actor.role === UserRole.SUPER_ADMIN) return true;
  if (actor.role === UserRole.ADMIN) {
    return targetRole !== UserRole.SUPER_ADMIN;
  }
  if (actor.role === UserRole.HR) {
    return targetRole !== UserRole.SUPER_ADMIN && targetRole !== UserRole.ADMIN;
  }
  return false;
}

export const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatar: true,
  role: true,
  status: true,
  jobTitle: true,
  phone: true,
  departmentId: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  department: {
    select: { id: true, name: true },
  },
} as const;

export async function hashUserPassword(password: string) {
  return hashPassword(password);
}
