import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";

export async function notifyDepartmentOfFounderKnowledge(params: {
  departmentId: string;
  title: string;
  chapterId: string;
  founderNote?: string | null;
}) {
  const members = await prisma.user.findMany({
    where: {
      departmentId: params.departmentId,
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

  const message = params.founderNote
    ? params.founderNote.slice(0, 200)
    : `New knowledge from leadership: ${params.title}`;

  await prisma.notification.createMany({
    data: members.map((m) => ({
      userId: m.id,
      type: "ANNOUNCEMENT" as const,
      title: "Message from Founder",
      message,
      link: `/learning-modules/${params.chapterId}`,
    })),
  });
}
