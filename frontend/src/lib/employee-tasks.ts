import { UserRole } from "@prisma/client";
import type { JWTPayload } from "./auth";
import { hasPermission } from "./rbac";
import { prisma } from "./prisma";

const TEAM_MEMBER_ROLES: UserRole[] = [
  UserRole.EMPLOYEE,
  UserRole.STUDENT,
  UserRole.TRAINER,
];

export function canManageEmployeeTasks(auth: JWTPayload): boolean {
  return hasPermission(auth, "MANAGE_ASSIGNMENTS");
}

export async function getManagerDepartmentId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { departmentId: true },
  });
  return user?.departmentId ?? null;
}

export async function getEmployeeTaskListFilter(auth: JWTPayload) {
  if (
    auth.role === UserRole.SUPER_ADMIN ||
    auth.role === UserRole.ADMIN ||
    auth.role === UserRole.HR
  ) {
    return {};
  }

  if (canManageEmployeeTasks(auth)) {
    const departmentId = await getManagerDepartmentId(auth.userId);
    if (!departmentId) return { departmentId: "__none__" };
    return { departmentId };
  }

  return { assigneeId: auth.userId };
}

export async function canAccessEmployeeTask(
  auth: JWTPayload,
  task: { departmentId: string; assigneeId: string; assignedById: string }
): Promise<boolean> {
  if (auth.role === UserRole.SUPER_ADMIN || auth.role === UserRole.ADMIN) return true;
  if (auth.role === UserRole.HR) return true;

  if (canManageEmployeeTasks(auth)) {
    const departmentId = await getManagerDepartmentId(auth.userId);
    return departmentId === task.departmentId;
  }

  return task.assigneeId === auth.userId;
}

export async function validateTeamAssignee(
  managerId: string,
  assigneeId: string
): Promise<{ ok: true; departmentId: string } | { ok: false; error: string }> {
  const managerDept = await getManagerDepartmentId(managerId);
  if (!managerDept) {
    return { ok: false, error: "Your manager account has no department assigned" };
  }

  const assignee = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { id: true, departmentId: true, role: true, status: true },
  });

  if (!assignee || assignee.status !== "ACTIVE") {
    return { ok: false, error: "Selected employee not found" };
  }

  if (assignee.departmentId !== managerDept) {
    return { ok: false, error: "You can only assign tasks to employees in your department" };
  }

  if (!TEAM_MEMBER_ROLES.includes(assignee.role)) {
    return { ok: false, error: "Tasks can only be assigned to team members in your department" };
  }

  return { ok: true, departmentId: managerDept };
}

export async function notifyEmployeeOfTask(
  assigneeId: string,
  title: string,
  taskId: string
) {
  await prisma.notification.create({
    data: {
      userId: assigneeId,
      type: "TASK_ASSIGNED",
      title: "New task from your manager",
      message: title,
      link: `/my-tasks/${taskId}`,
    },
  });
}
