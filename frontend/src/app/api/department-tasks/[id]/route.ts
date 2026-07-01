import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
  createAuditLog,
} from "@/lib/api-helpers";
import {
  canAccessDepartmentTask,
  canAssignFounderTasks,
  canFollowDepartmentTasks,
  canUpdateTaskStatus,
  canViewDepartmentTasks,
} from "@/lib/department-tasks";
import { updateDepartmentTaskSchema } from "@/lib/validations";

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true } },
  assignedBy: { select: { id: true, firstName: true, lastName: true } },
  completedBy: { select: { id: true, firstName: true, lastName: true } },
  updates: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      status: true,
      note: true,
      createdAt: true,
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  },
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    if (!canViewDepartmentTasks(auth)) {
      return apiError("Forbidden", 403);
    }

    const { id } = await params;
    const task = await prisma.departmentTask.findUnique({
      where: { id },
      select: taskSelect,
    });
    if (!task) return apiError("Task not found", 404);

    if (!(await canAccessDepartmentTask(auth, task.department.id))) {
      return apiError("Forbidden", 403);
    }

    return apiSuccess(task);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const existing = await prisma.departmentTask.findUnique({ where: { id } });
    if (!existing) return apiError("Task not found", 404);

    if (!(await canAccessDepartmentTask(auth, existing.departmentId))) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const data = updateDepartmentTaskSchema.parse(body);

    const isFounder = canAssignFounderTasks(auth);
    const canFollow = canFollowDepartmentTasks(auth);
    const canManageStatus = canUpdateTaskStatus(auth);

    if (!isFounder && !canFollow) {
      return apiError("Forbidden", 403);
    }

    if ((data.title || data.description || data.priority || data.dueDate !== undefined) && !isFounder) {
      return apiError("Only founder can edit task details", 403);
    }

    if (data.status) {
      if (data.status === "CANCELLED" && !isFounder) {
        return apiError("Only founder can cancel tasks", 403);
      }
      if (data.status === "COMPLETED" && !canManageStatus) {
        return apiError("Only managers can mark tasks complete", 403);
      }
      if (
        data.status === "IN_PROGRESS" &&
        existing.status === "ASSIGNED" &&
        !canFollow
      ) {
        return apiError("Forbidden", 403);
      }
      if (
        data.status !== "IN_PROGRESS" &&
        data.status !== existing.status &&
        !canManageStatus &&
        !isFounder
      ) {
        return apiError("Only managers can update task status", 403);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority) updateData.priority = data.priority;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    if (data.status) {
      updateData.status = data.status;
      if (data.status === "COMPLETED") {
        updateData.completedAt = new Date();
        updateData.completedById = auth.userId;
      } else if (existing.status === "COMPLETED") {
        updateData.completedAt = null;
        updateData.completedById = null;
      }
    }

    const task = await prisma.departmentTask.update({
      where: { id },
      data: {
        ...updateData,
        ...(data.note || data.status
          ? {
              updates: {
                create: {
                  userId: auth.userId,
                  status: data.status ?? undefined,
                  note: data.note ?? undefined,
                },
              },
            }
          : {}),
      },
      select: taskSelect,
    });

    if (data.status && data.status !== existing.status) {
      await createAuditLog({
        userId: auth.userId,
        action: "UPDATE",
        entityType: "DepartmentTask",
        entityId: id,
        details: { status: data.status },
      });
    }

    return apiSuccess(task);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    if (!canAssignFounderTasks(auth)) {
      return apiError("Forbidden", 403);
    }

    const { id } = await params;
    const existing = await prisma.departmentTask.findUnique({ where: { id } });
    if (!existing) return apiError("Task not found", 404);

    await prisma.departmentTask.delete({ where: { id } });

    await createAuditLog({
      userId: auth.userId,
      action: "DELETE",
      entityType: "DepartmentTask",
      entityId: id,
      details: { title: existing.title },
    });

    return apiSuccess({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
