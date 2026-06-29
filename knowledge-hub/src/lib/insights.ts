import { prisma } from "./prisma";
import { ProgressType } from "@prisma/client";
import type { JWTPayload } from "./auth";
import {
  canBypassDepartmentFilter,
  resolveAuthDepartment,
} from "./department-access";

export interface UserInsights {
  totalModules: number;
  completedModules: number;
  pendingModules: number;
  overallProgress: number;
  chaptersCompleted: number;
  sopsCompleted: number;
  quizzesCompleted: number;
  totalChapters: number;
  totalSOPs: number;
  totalQuizzes: number;
  timeSpentMinutes: number;
  quizScores: {
    quizId: string;
    quizTitle: string;
    score: number;
    passed: boolean;
  }[];
  recentCompletions: {
    id: string;
    title: string;
    type: ProgressType;
    completedAt: string;
  }[];
  weeklyProgress: { week: string; completed: number }[];
  departmentProgress: { departmentId: string; name: string; completed: number; total: number; progress: number }[];
}

function getWeekLabel(date: Date): string {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const month = start.toLocaleString("en", { month: "short" });
  const day = start.getDate();
  return `${month} ${day}`;
}

function buildWeeklyProgress(
  completions: { completedAt: Date | null }[]
): { week: string; completed: number }[] {
  const weeks: { week: string; completed: number }[] = [];
  const now = new Date();

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const count = completions.filter((c) => {
      if (!c.completedAt) return false;
      const d = new Date(c.completedAt);
      return d >= weekStart && d < weekEnd;
    }).length;

    weeks.push({ week: getWeekLabel(weekStart), completed: count });
  }

  return weeks;
}

export async function computeUserInsights(
  userId: string,
  auth?: JWTPayload
): Promise<UserInsights> {
  const departmentId = auth
    ? await resolveAuthDepartment(auth)
    : (
        await prisma.user.findUnique({
          where: { id: userId },
          select: { departmentId: true, role: true },
        })
      )?.departmentId ?? null;

  const bypass = auth ? canBypassDepartmentFilter(auth.role) : false;
  const contentDeptFilter =
    bypass || !departmentId ? {} : { departmentId };

  const [publishedChapters, publishedSOPs, publishedQuizzes, publishedLessons, userProgress, departments] =
    await Promise.all([
      prisma.knowledgeChapter.findMany({
        where: { status: "PUBLISHED", ...contentDeptFilter },
        select: { id: true, title: true, departmentId: true, estimatedMinutes: true },
      }),
      prisma.sOP.findMany({
        where: { status: "PUBLISHED", ...contentDeptFilter },
        select: { id: true, title: true, departmentId: true },
      }),
      prisma.quiz.findMany({
        where: { status: "PUBLISHED", ...contentDeptFilter },
        select: { id: true, title: true, departmentId: true, passingPercentage: true },
      }),
      prisma.lesson.findMany({
        where: {
          module: {
            course: { status: "PUBLISHED", ...contentDeptFilter },
          },
        },
        select: { id: true, module: { select: { course: { select: { departmentId: true } } } } },
      }),
      prisma.progress.findMany({
        where: { userId, completed: true },
        select: {
          id: true,
          type: true,
          chapterId: true,
          sopId: true,
          quizId: true,
          lessonId: true,
          score: true,
          timeSpentMinutes: true,
          completedAt: true,
          chapter: { select: { title: true } },
          sop: { select: { title: true } },
          quiz: { select: { title: true, passingPercentage: true } },
          lesson: { select: { title: true } },
        },
        orderBy: { completedAt: "desc" },
      }),
      prisma.department.findMany({
        where: bypass
          ? { status: "ACTIVE" }
          : { status: "ACTIVE", ...(departmentId ? { id: departmentId } : { id: "__none__" }) },
        select: { id: true, name: true },
      }),
    ]);

  const totalChapters = publishedChapters.length;
  const totalSOPs = publishedSOPs.length;
  const totalQuizzes = publishedQuizzes.length;
  const totalLessons = publishedLessons.length;
  const totalModules = totalChapters + totalSOPs + totalQuizzes + totalLessons;

  const completedChapterIds = new Set(
    userProgress.filter((p) => p.type === ProgressType.CHAPTER).map((p) => p.chapterId)
  );
  const completedSOPIds = new Set(
    userProgress.filter((p) => p.type === ProgressType.SOP).map((p) => p.sopId)
  );
  const completedQuizIds = new Set(
    userProgress.filter((p) => p.type === ProgressType.QUIZ).map((p) => p.quizId)
  );
  const completedLessonIds = new Set(
    userProgress.filter((p) => p.type === ProgressType.LESSON).map((p) => p.lessonId)
  );

  const chaptersCompleted = completedChapterIds.size;
  const sopsCompleted = completedSOPIds.size;
  const quizzesCompleted = completedQuizIds.size;
  const lessonsCompleted = completedLessonIds.size;
  const completedModules = chaptersCompleted + sopsCompleted + quizzesCompleted + lessonsCompleted;
  const pendingModules = Math.max(0, totalModules - completedModules);
  const overallProgress =
    totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  const timeSpentMinutes = userProgress.reduce((sum, p) => sum + (p.timeSpentMinutes ?? 0), 0);

  const quizScores = userProgress
    .filter((p) => p.type === ProgressType.QUIZ && p.quiz && p.score != null)
    .map((p) => ({
      quizId: p.quizId!,
      quizTitle: p.quiz!.title,
      score: Math.round(p.score!),
      passed: p.score! >= (p.quiz!.passingPercentage ?? 70),
    }));

  const recentCompletions = userProgress.slice(0, 5).map((p) => ({
    id: p.id,
    title: p.chapter?.title ?? p.sop?.title ?? p.quiz?.title ?? p.lesson?.title ?? "Learning item",
    type: p.type,
    completedAt: p.completedAt!.toISOString(),
  }));

  const weeklyProgress = buildWeeklyProgress(userProgress);

  const deptMap = new Map(departments.map((d) => [d.id, d.name]));
  const deptTotals = new Map<string, number>();
  const deptCompleted = new Map<string, number>();

  for (const ch of publishedChapters) {
    deptTotals.set(ch.departmentId, (deptTotals.get(ch.departmentId) ?? 0) + 1);
    if (completedChapterIds.has(ch.id)) {
      deptCompleted.set(ch.departmentId, (deptCompleted.get(ch.departmentId) ?? 0) + 1);
    }
  }
  for (const sop of publishedSOPs) {
    deptTotals.set(sop.departmentId, (deptTotals.get(sop.departmentId) ?? 0) + 1);
    if (completedSOPIds.has(sop.id)) {
      deptCompleted.set(sop.departmentId, (deptCompleted.get(sop.departmentId) ?? 0) + 1);
    }
  }
  for (const quiz of publishedQuizzes) {
    if (quiz.departmentId) {
      deptTotals.set(quiz.departmentId, (deptTotals.get(quiz.departmentId) ?? 0) + 1);
      if (completedQuizIds.has(quiz.id)) {
        deptCompleted.set(quiz.departmentId, (deptCompleted.get(quiz.departmentId) ?? 0) + 1);
      }
    }
  }

  for (const lesson of publishedLessons) {
    const deptId = lesson.module.course.departmentId;
    if (deptId) {
      deptTotals.set(deptId, (deptTotals.get(deptId) ?? 0) + 1);
      if (completedLessonIds.has(lesson.id)) {
        deptCompleted.set(deptId, (deptCompleted.get(deptId) ?? 0) + 1);
      }
    }
  }

  const departmentProgress = Array.from(deptTotals.entries())
    .map(([departmentId, total]) => {
      const completed = deptCompleted.get(departmentId) ?? 0;
      return {
        departmentId,
        name: deptMap.get(departmentId) ?? "Unknown",
        completed,
        total,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    })
    .filter((d) => d.total > 0)
    .sort((a, b) => b.progress - a.progress);

  return {
    totalModules,
    completedModules,
    pendingModules,
    overallProgress,
    chaptersCompleted,
    sopsCompleted,
    quizzesCompleted,
    totalChapters,
    totalSOPs,
    totalQuizzes,
    timeSpentMinutes,
    quizScores,
    recentCompletions,
    weeklyProgress,
    departmentProgress,
  };
}

export async function markLearningComplete(params: {
  userId: string;
  type: ProgressType;
  chapterId?: string;
  sopId?: string;
  quizId?: string;
  score?: number;
  timeSpentMinutes?: number;
}) {
  const { userId, type, chapterId, sopId, quizId, score, timeSpentMinutes } = params;

  const where = {
    userId,
    type,
    ...(chapterId && { chapterId }),
    ...(sopId && { sopId }),
    ...(quizId && { quizId }),
  };

  const existing = await prisma.progress.findFirst({ where });

  const data = {
    completed: true,
    completedAt: new Date(),
    ...(score != null && { score }),
    ...(timeSpentMinutes != null && { timeSpentMinutes }),
  };

  if (existing) {
    return prisma.progress.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.progress.create({
    data: {
      userId,
      type,
      chapterId,
      sopId,
      quizId,
      ...data,
      timeSpentMinutes: timeSpentMinutes ?? 0,
    },
  });
}

export async function getUserCompletionMap(userId: string) {
  const progress = await prisma.progress.findMany({
    where: { userId, completed: true },
    select: { type: true, chapterId: true, sopId: true, quizId: true },
  });

  return {
    chapters: new Set(
      progress.filter((p) => p.type === ProgressType.CHAPTER).map((p) => p.chapterId!)
    ),
    sops: new Set(progress.filter((p) => p.type === ProgressType.SOP).map((p) => p.sopId!)),
    quizzes: new Set(progress.filter((p) => p.type === ProgressType.QUIZ).map((p) => p.quizId!)),
  };
}
