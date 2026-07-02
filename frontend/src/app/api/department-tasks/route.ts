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
import {
  createFounderSopFromTask,
  notifyDepartmentOfNewSop,
} from "@/lib/founder-sop";
import { isFounderRole } from "@/lib/founder";
import { getEmailConfig } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/client";
import { UserRole, UserStatus } from "@prisma/client";
import type { z } from "zod";

type DepartmentTaskInput = z.infer<typeof departmentTaskSchema>;

async function notifyAllPanelsOfFounderInstruction(params: {
  actorUserId: string;
  departmentName: string;
  title: string;
}) {
  const users = await prisma.user.findMany({
    where: {
      id: { not: params.actorUserId },
      status: UserStatus.ACTIVE,
      role: {
        in: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR, UserRole.TRAINER],
      },
    },
    select: { id: true },
  });

  if (!users.length) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: "ANNOUNCEMENT" as const,
      title: "Founder instruction sent",
      message: `${params.title} — sent to ${params.departmentName}`,
      link: "/department-tasks",
    })),
  });
}

async function emailDepartmentUsersAboutFounderInstruction(params: {
  departmentId: string;
  departmentName: string;
  title: string;
  description?: string | null;
}) {
  const config = getEmailConfig();
  const appUrl = config.appUrl;

  const recipients = await prisma.user.findMany({
    where: {
      departmentId: params.departmentId,
      status: UserStatus.ACTIVE,
      role: {
        in: [
          UserRole.MANAGER,
          UserRole.DEPARTMENT_HEAD,
          UserRole.EMPLOYEE,
          UserRole.STUDENT,
          UserRole.TRAINER,
        ],
      },
    },
    select: { email: true, firstName: true },
  });

  if (!recipients.length) return;

  const subject = `Founder instruction — ${params.departmentName}`;
  const details = (params.description ?? "").trim();
  const taskUrl = `${appUrl}/department-tasks`;

  const html = `
<!doctype html>
<html>
  <body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111827;max-width:640px;margin:0 auto;padding:24px;">
    <h1 style="font-size:18px;margin:0 0 12px;">Founder instruction for ${params.departmentName}</h1>
    <p style="margin:0 0 8px;"><strong>${params.title}</strong></p>
    ${details ? `<p style="margin:0 0 16px;color:#374151;white-space:pre-wrap;">${details
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</p>` : ""}
    <p style="margin:18px 0 0;">
      <a href="${taskUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 16px;border-radius:8px;text-decoration:none;font-weight:600;">
        Open Department Tasks
      </a>
    </p>
    <p style="margin-top:24px;font-size:12px;color:#6b7280;">Sent via ${config.appName}.</p>
  </body>
</html>`;

  const text = `Founder instruction for ${params.departmentName}

${params.title}
${details ? `\n${details}\n` : ""}
Open: ${taskUrl}
`;

  // Basic batching to avoid large parallel bursts.
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map((u) =>
        sendEmail({
          to: u.email,
          subject,
          html,
          text,
        })
      )
    );
  }
}

async function createFounderDepartmentTask(
  auth: { userId: string },
  data: DepartmentTaskInput,
  departmentId: string,
  departmentName: string
) {
  const task = await prisma.departmentTask.create({
    data: {
      title: data.title,
      description: data.description,
      departmentId,
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
    select: { id: true, title: true },
  });

  if (data.attachments?.length) {
    await prisma.attachment.createMany({
      data: data.attachments.map((file) => ({
        taskId: task.id,
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        url: file.url,
      })),
    });

    try {
      const sop = await createFounderSopFromTask({
        taskId: task.id,
        title: data.title,
        description: data.description,
        departmentId,
        ownerId: auth.userId,
        attachments: data.attachments,
      });
      if (sop) {
        await notifyDepartmentOfNewSop(departmentId, sop.title, sop.id);
      }
    } catch (sopError) {
      console.error("Founder SOP creation failed (task still assigned):", sopError);
    }
  }

  const created = await prisma.departmentTask.findUnique({
    where: { id: task.id },
    select: taskSelect,
  });

  await notifyDepartmentOfTask(
    departmentId,
    "New task assigned",
    `${data.title} — assigned to ${departmentName}`,
    "/department-tasks"
  );

  await notifyAllPanelsOfFounderInstruction({
    actorUserId: auth.userId,
    departmentName,
    title: data.title,
  });

  await emailDepartmentUsersAboutFounderInstruction({
    departmentId,
    departmentName,
    title: data.title,
    description: data.description,
  });

  await createAuditLog({
    userId: auth.userId,
    action: "CREATE",
    entityType: "DepartmentTask",
    entityId: task.id,
    details: { title: task.title, departmentId },
  });

  return created;
}

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
  attachments: {
    select: {
      id: true,
      filename: true,
      originalName: true,
      mimeType: true,
      size: true,
      url: true,
    },
  },
  sop: { select: { id: true, title: true } },
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

    if (data.assignToAllDepartments) {
      if (!isFounderRole(auth.role)) {
        return apiError("Only the founder can assign tasks to all departments", 403);
      }

      const departments = await prisma.department.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true },
      });

      if (!departments.length) {
        return apiError("No active departments found", 400);
      }

      const created = [];
      for (const dept of departments) {
        const task = await createFounderDepartmentTask(auth, data, dept.id, dept.name);
        if (task) created.push(task);
      }

      return apiSuccess(
        {
          bulk: true,
          count: created.length,
          tasks: created,
        },
        201
      );
    }

    if (!data.departmentId) {
      return apiError("Department is required", 400);
    }

    const department = await prisma.department.findUnique({
      where: { id: data.departmentId },
    });
    if (!department) return apiError("Department not found", 404);

    const created = await createFounderDepartmentTask(
      auth,
      data,
      data.departmentId,
      department.name
    );

    return apiSuccess(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
