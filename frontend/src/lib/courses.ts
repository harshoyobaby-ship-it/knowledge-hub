import { prisma } from "./prisma";
import { UserRole } from "@prisma/client";
import type { JWTPayload } from "./auth";
import { getLearnerContentFilter } from "./department-access";

export interface CourseManagerContext {
  userId: string;
  role: UserRole;
  departmentId: string | null;
  canManageAll: boolean;
}

export function isLearnerRole(role: UserRole): boolean {
  return role === UserRole.EMPLOYEE || role === UserRole.STUDENT;
}

export async function getCourseManager(
  auth: JWTPayload
): Promise<CourseManagerContext | null> {
  const managers: UserRole[] = [
    UserRole.SUPER_ADMIN,
    UserRole.HR,
    UserRole.DEPARTMENT_HEAD,
  ];
  if (!managers.includes(auth.role)) return null;

  if (auth.role === UserRole.SUPER_ADMIN || auth.role === UserRole.HR) {
    return {
      userId: auth.userId,
      role: auth.role,
      departmentId: null,
      canManageAll: true,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { departmentId: true },
  });
  if (!user?.departmentId) return null;

  return {
    userId: auth.userId,
    role: auth.role,
    departmentId: user.departmentId,
    canManageAll: false,
  };
}

export function canAccessCourseDepartment(
  ctx: CourseManagerContext,
  departmentId: string | null | undefined
): boolean {
  if (ctx.canManageAll) return true;
  if (!departmentId) return true;
  return ctx.departmentId === departmentId;
}

export function departmentCourseFilter(ctx: CourseManagerContext) {
  if (ctx.canManageAll) return {};
  return { departmentId: ctx.departmentId! };
}

export async function getLearnerCourseFilter(auth: JWTPayload) {
  const deptFilter = await getLearnerContentFilter(auth);
  return {
    status: "PUBLISHED" as const,
    ...deptFilter,
  };
}

export async function computeCourseProgress(userId: string, courseId: string) {
  const lessons = await prisma.lesson.findMany({
    where: { module: { courseId } },
    select: { id: true },
  });
  if (lessons.length === 0) return 0;

  const completed = await prisma.lessonProgress.count({
    where: {
      userId,
      lessonId: { in: lessons.map((l) => l.id) },
      completed: true,
    },
  });

  return Math.round((completed / lessons.length) * 100);
}

export async function syncEnrollmentProgress(userId: string, courseId: string) {
  const progress = await computeCourseProgress(userId, courseId);
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) return;

  await prisma.courseEnrollment.update({
    where: { id: enrollment.id },
    data: {
      progress,
      completedAt: progress === 100 ? new Date() : null,
    },
  });
}

export const courseSelect = {
  id: true,
  title: true,
  description: true,
  thumbnail: true,
  difficulty: true,
  estimatedHours: true,
  status: true,
  isSelfPaced: true,
  publishedAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true } },
  author: { select: { firstName: true, lastName: true } },
  _count: { select: { modules: true, enrollments: true } },
} as const;
