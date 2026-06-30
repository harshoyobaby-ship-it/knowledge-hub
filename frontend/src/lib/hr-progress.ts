import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { computeUserInsights } from "@/lib/insights";

export interface EmployeeProgressRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  role: UserRole;
  status: string;
  department: { id: string; name: string } | null;
  overallProgress: number;
  completedModules: number;
  pendingModules: number;
  totalModules: number;
  chaptersCompleted: number;
  sopsCompleted: number;
  quizzesCompleted: number;
  timeSpentMinutes: number;
  lastActivity: string | null;
}

const LEARNER_ROLES: UserRole[] = [
  UserRole.EMPLOYEE,
  UserRole.STUDENT,
  UserRole.TRAINER,
];

export async function getEmployeesProgress(options?: {
  departmentId?: string;
}): Promise<EmployeeProgressRow[]> {
  const employees = await prisma.user.findMany({
    where: {
      role: { in: LEARNER_ROLES },
      status: "ACTIVE",
      ...(options?.departmentId ? { departmentId: options.departmentId } : {}),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      role: true,
      status: true,
      department: { select: { id: true, name: true } },
    },
    orderBy: [{ lastName: "asc" }],
  });

  const rows = await Promise.all(
    employees.map(async (emp) => {
      const insights = await computeUserInsights(emp.id);
      const lastProgress = await prisma.progress.findFirst({
        where: { userId: emp.id, completed: true },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      });

      return {
        id: emp.id,
        email: emp.email,
        firstName: emp.firstName,
        lastName: emp.lastName,
        jobTitle: emp.jobTitle,
        role: emp.role,
        status: emp.status,
        department: emp.department,
        overallProgress: insights.overallProgress,
        completedModules: insights.completedModules,
        pendingModules: insights.pendingModules,
        totalModules: insights.totalModules,
        chaptersCompleted: insights.chaptersCompleted,
        sopsCompleted: insights.sopsCompleted,
        quizzesCompleted: insights.quizzesCompleted,
        timeSpentMinutes: insights.timeSpentMinutes,
        lastActivity: lastProgress?.completedAt?.toISOString() ?? null,
      };
    })
  );

  return rows;
}

export async function getEmployeeProgressDetail(
  userId: string,
  options?: { departmentId?: string }
) {
  const employee = await prisma.user.findFirst({
    where: {
      id: userId,
      role: { in: LEARNER_ROLES },
      status: "ACTIVE",
      ...(options?.departmentId ? { departmentId: options.departmentId } : {}),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      role: true,
      department: { select: { id: true, name: true } },
      createdAt: true,
    },
  });

  if (!employee) return null;

  const insights = await computeUserInsights(userId);

  return { employee, insights };
}
