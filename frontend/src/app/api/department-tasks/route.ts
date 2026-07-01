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
import {
  canAssignFounderTasks,
  canViewDepartmentTasks,
  getDepartmentTaskListFilter,
  notifyDepartmentOfTask,
} from "@/lib/department-tasks";
import { departmentTaskSchema } from "@/lib/validations";

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
  _count: { select: { updates: true } },
} as const;

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    if (!canViewDepartmentTasks(auth)) {
      return apiError("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const status = searchParams.get("status");
    const departmentId = searchParams.get("departmentId");
    const manage = searchParams.get("manage") === "true";

    if (manage && !canAssignFounderTasks(auth)) {
      return apiError("Forbidden", 403);
    }

    const where: Record<string, unknown> = {
      ...(await getDepartmentTaskListFilter(auth)),
    };

    if (status && status !== "all") where.status = status;
    if (departmentId) where.departmentId = departmentId;

    const [tasks, total] = await Promise.all([
      prisma.departmentTask.findMany({
        where,
        select: taskSelect,
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.departmentTask.count({ where }),
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
    const auth = await requirePermission(request, "ASSIGN_FOUNDER_TASKS");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const data = departmentTaskSchema.parse(body);

    const department = await prisma.department.findUnique({
      where: { id: data.departmentId },
    });
    if (!department) return apiError("Department not found", 404);

    const task = await prisma.departmentTask.create({
      data: {
        title: data.title,
        description: data.description,
        departmentId: data.departmentId,
        assignedById: auth.userId,
        priority: data.priority ?? "MEDIUM",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        updates: {
          create: {
            userId: auth.userId,
            status: "ASSIGNED",
            note: "Task assigned by founder",
          },
        },
      },
      select: taskSelect,
    });

    await notifyDepartmentOfTask(
      data.departmentId,
      "New task assigned",
      `${data.title} — assigned to ${department.name}`,
      "/department-tasks"
    );

    await createAuditLog({
      userId: auth.userId,
      action: "CREATE",
      entityType: "DepartmentTask",
      entityId: task.id,
      details: { title: task.title, departmentId: data.departmentId },
    });

    return apiSuccess(task, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
