import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
  requirePermission,
  parsePagination,
  createAuditLog,
} from "@/lib/api-helpers";
import { createEmployeeTaskSchema, updateEmployeeTaskSchema } from "@/lib/validations";
import {
  canManageEmployeeTasks,
  getEmployeeTaskListFilter,
  validateTeamAssignee,
  notifyEmployeeOfTask,
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

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const status = searchParams.get("status");
    const manage = searchParams.get("manage") === "true";

    if (manage && !canManageEmployeeTasks(auth)) {
      return apiError("Forbidden", 403);
    }

    const scope = await getEmployeeTaskListFilter(auth);
    const where = {
      ...scope,
      ...(status && status !== "all"
        ? { status: status as "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" }
        : {}),
    };

    const [tasks, total] = await Promise.all([
      prisma.employeeTask.findMany({
        where,
        select: taskSelect,
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.employeeTask.count({ where }),
    ]);

    return apiSuccess({
      data: tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, "MANAGE_ASSIGNMENTS");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const data = createEmployeeTaskSchema.parse(body);

    const validation = await validateTeamAssignee(auth.userId, data.assigneeId);
    if (!validation.ok) return apiError(validation.error, 403);

    const task = await prisma.employeeTask.create({
      data: {
        title: data.title,
        description: data.description,
        departmentId: validation.departmentId,
        assigneeId: data.assigneeId,
        assignedById: auth.userId,
        priority: data.priority ?? "MEDIUM",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      select: taskSelect,
    });

    await notifyEmployeeOfTask(task.assignee.id, task.title, task.id);

    await createAuditLog({
      userId: auth.userId,
      action: "CREATE",
      entityType: "EmployeeTask",
      entityId: task.id,
      details: { title: task.title, assigneeId: data.assigneeId },
    });

    return apiSuccess(task, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
