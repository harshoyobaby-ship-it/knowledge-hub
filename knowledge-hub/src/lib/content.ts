import { UserRole } from "@prisma/client";
import type { JWTPayload } from "./auth";
import { hasPermission } from "./rbac";
import { prisma } from "./prisma";

export interface ContentManagerContext {
  userId: string;
  role: UserRole;
  departmentId: string | null;
  canManageAll: boolean;
}

export function canManageContentRole(role: UserRole): boolean {
  return (
    role === UserRole.SUPER_ADMIN ||
    role === UserRole.ADMIN ||
    role === UserRole.HR ||
    role === UserRole.MANAGER ||
    role === UserRole.DEPARTMENT_HEAD ||
    role === UserRole.TRAINER
  );
}

export async function getContentManager(
  auth: JWTPayload
): Promise<ContentManagerContext | null> {
  if (!canManageContentRole(auth.role)) return null;

  if (
    auth.role === UserRole.SUPER_ADMIN ||
    auth.role === UserRole.ADMIN ||
    auth.role === UserRole.HR
  ) {
    return {
      userId: auth.userId,
      role: auth.role,
      departmentId: null,
      canManageAll: true,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { departmentId: true },
  });

  if (!user?.departmentId) return null;

  return {
    userId: auth.userId,
    role: auth.role,
    departmentId: user.departmentId,
    canManageAll: false,
  };
}

export function canAccessDepartment(
  ctx: ContentManagerContext,
  departmentId: string | null | undefined
): boolean {
  if (ctx.canManageAll) return true;
  if (!departmentId) return false;
  return ctx.departmentId === departmentId;
}

export function departmentFilter(ctx: ContentManagerContext) {
  if (ctx.canManageAll) return {};
  return { departmentId: ctx.departmentId! };
}
