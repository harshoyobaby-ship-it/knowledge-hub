import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
  createAuditLog,
} from "@/lib/api-helpers";
import { updateEmployeeTaskSchema } from "@/lib/validations";
import {
  canManageEmployeeTasks,
  canAccessEmployeeTask,
} from "@/lib/employee-tasks";

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
  departmentId: true,
  assigneeId: true,
  assignedById: true,
  department: { select: { id: true, name: true } },
  assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
  assignedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const task = await prisma.employeeTask.findUnique({
      where: { id },
      select: taskSelect,
    });

    if (!task) return apiError("Task not found", 404);
    if (!(await canAccessEmployeeTask(auth, task))) {
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
    const existing = await prisma.employeeTask.findUnique({ where: { id } });
    if (!existing) return apiError("Task not found", 404);
    if (!(await canAccessEmployeeTask(auth, existing))) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const data = updateEmployeeTaskSchema.parse(body);
    const isManager = canManageEmployeeTasks(auth);
    const isAssignee = existing.assigneeId === auth.userId;

    if (data.status && !isManager && !isAssignee) {
      return apiError("Forbidden", 403);
    }

    if (data.status === "COMPLETED" && !isManager && !isAssignee) {
      return apiError("Only the assignee or manager can complete this task", 403);
    }

    const status = data.status ?? existing.status;
    const completedAt =
      status === "COMPLETED" && existing.status !== "COMPLETED"
        ? new Date()
        : existing.completedAt;

    const task = await prisma.employeeTask.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
        status,
        completedAt,
      },
      select: taskSelect,
    });

    await createAuditLog({
      userId: auth.userId,
      action: "UPDATE",
      entityType: "EmployeeTask",
      entityId: task.id,
      details: { status: task.status },
    });

    return apiSuccess(task);
  } catch (error) {
    return handleApiError(error);
  }
}
