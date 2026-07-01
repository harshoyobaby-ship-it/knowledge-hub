import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";

type TaskAttachment = {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
};

export async function createFounderSopFromTask(params: {
  taskId: string;
  title: string;
  description?: string | null;
  departmentId: string;
  ownerId: string;
  attachments: TaskAttachment[];
}) {
  if (!params.attachments.length) return null;

  const primary = params.attachments[0];
  const sopTitle =
    params.attachments.length === 1 && params.title.trim().length < 3
      ? primary.originalName.replace(/\.[^.]+$/, "")
      : params.title;

  const sop = await prisma.sOP.create({
    data: {
      title: sopTitle,
      departmentId: params.departmentId,
      ownerId: params.ownerId,
      effectiveDate: new Date(),
      fileUrl: primary.url,
      fileName: primary.originalName,
      status: "PUBLISHED",
      approvalStatus: "APPROVED",
      versions: {
        create: {
          version: 1,
          fileUrl: primary.url,
          fileName: primary.originalName,
          changeNotes: params.description ?? "Published by founder as department SOP",
          authorId: params.ownerId,
        },
      },
    },
    select: { id: true, title: true },
  });

  await prisma.attachment.createMany({
    data: params.attachments.map((file) => ({
      sopId: sop.id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      url: file.url,
    })),
  });

  await prisma.departmentTask.update({
    where: { id: params.taskId },
    data: { sopId: sop.id },
  });

  return sop;
}

export async function notifyDepartmentOfNewSop(
  departmentId: string,
  sopTitle: string,
  sopId: string
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
          UserRole.TRAINER,
        ],
      },
    },
    select: { id: true },
  });

  if (!members.length) return;

  await prisma.notification.createMany({
    data: members.map((m) => ({
      userId: m.id,
      type: "NEW_SOP" as const,
      title: "New SOP from Founder",
      message: `${sopTitle} is now available in the SOP Library`,
      link: `/sops/${sopId}`,
    })),
  });
}
