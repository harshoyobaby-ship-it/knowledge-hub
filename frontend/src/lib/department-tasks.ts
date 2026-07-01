import { UserRole } from "@prisma/client";
import type { JWTPayload } from "./auth";
import { hasPermission } from "./rbac";
import { prisma } from "./prisma";

export async function getUserDepartmentId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { departmentId: true },
  });
  return user?.departmentId ?? null;
}

export function canAssignFounderTasks(auth: JWTPayload): boolean {
  return hasPermission(auth, "ASSIGN_FOUNDER_TASKS");
}

export function canViewDepartmentTasks(auth: JWTPayload): boolean {
  return hasPermission(auth, "VIEW_DEPARTMENT_TASKS");
}

export function canFollowDepartmentTasks(auth: JWTPayload): boolean {
  return hasPermission(auth, "FOLLOW_DEPARTMENT_TASKS");
}

export async function getDepartmentTaskListFilter(auth: JWTPayload) {
  if (canAssignFounderTasks(auth)) {
    return {};
  }

  const departmentId = await getUserDepartmentId(auth.userId);
  if (!departmentId) {
    return { departmentId: "__none__" };
  }

  return { departmentId };
}

export async function canAccessDepartmentTask(
  auth: JWTPayload,
  departmentId: string
): Promise<boolean> {
  if (canAssignFounderTasks(auth)) return true;
  if (auth.role === UserRole.HR) return true;

  const userDeptId = await getUserDepartmentId(auth.userId);
  return userDeptId === departmentId;
}

export function canUpdateTaskStatus(auth: JWTPayload): boolean {
  return (
    canAssignFounderTasks(auth) ||
    auth.role === UserRole.MANAGER ||
    auth.role === UserRole.DEPARTMENT_HEAD
  );
}

export async function notifyDepartmentOfTask(
  departmentId: string,
  title: string,
  message: string,
  link: string
) {
  const members = await prisma.user.findMany({
    where: {
      departmentId,
      status: "ACTIVE",
      role: {
        in: [
          UserRole.MANAGER,
          UserRole.DEPARTMENT_HEAD,
          UserRole.EMPLOYEE,
          UserRole.STUDENT,
        ],
      },
    },
    select: { id: true },
  });

  if (!members.length) return;

  await prisma.notification.createMany({
    data: members.map((m) => ({
      userId: m.id,
      type: "TASK_ASSIGNED" as const,
      title,
      message,
      link,
    })),
  });
}
