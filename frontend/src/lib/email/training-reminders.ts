import { prisma } from "@/lib/prisma";
import { EmailStatus, EmailType, NotificationType, ProgressType, UserRole, UserStatus } from "@prisma/client";
import { computeUserInsights } from "@/lib/insights";
import { getEmailConfig } from "./config";
import { sendEmail } from "./client";
import {
  buildWeeklyTrainingReminderEmail,
  type PendingTrainingItem,
} from "./templates/weekly-training-reminder";

const LEARNER_ROLES: UserRole[] = [
  UserRole.EMPLOYEE,
  UserRole.STUDENT,
  UserRole.TRAINER,
];

export interface WeeklyReminderResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{ email: string; status: string; reason?: string }>;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function wasRecentlySent(userId: string, force: boolean): Promise<boolean> {
  if (force) return false;

  const recent = await prisma.emailLog.findFirst({
    where: {
      userId,
      type: EmailType.WEEKLY_TRAINING_REMINDER,
      status: EmailStatus.SENT,
      sentAt: { gte: daysAgo(6) },
    },
  });

  return Boolean(recent);
}

async function getPendingItems(
  userId: string,
  departmentId: string | null,
  appUrl: string
): Promise<{ pendingCount: number; overallProgress: number; items: PendingTrainingItem[] }> {
  const insights = await computeUserInsights(userId);

  const deptFilter = departmentId ? { departmentId } : {};

  const [chapters, sops, quizzes, lessons, progress] = await Promise.all([
    prisma.knowledgeChapter.findMany({
      where: { status: "PUBLISHED", ...deptFilter },
      select: { id: true, title: true },
    }),
    prisma.sOP.findMany({
      where: { status: "PUBLISHED", ...deptFilter },
      select: { id: true, title: true },
    }),
    prisma.quiz.findMany({
      where: { status: "PUBLISHED", ...deptFilter },
      select: { id: true, title: true },
    }),
    prisma.lesson.findMany({
      where: { module: { course: { status: "PUBLISHED", ...deptFilter } } },
      select: { id: true, title: true, module: { select: { courseId: true } } },
    }),
    prisma.progress.findMany({
      where: { userId, completed: true },
      select: { type: true, chapterId: true, sopId: true, quizId: true, lessonId: true },
    }),
  ]);

  const doneChapters = new Set(
    progress.filter((p) => p.type === ProgressType.CHAPTER).map((p) => p.chapterId)
  );
  const doneSops = new Set(progress.filter((p) => p.type === ProgressType.SOP).map((p) => p.sopId));
  const doneQuizzes = new Set(progress.filter((p) => p.type === ProgressType.QUIZ).map((p) => p.quizId));
  const doneLessons = new Set(
    progress.filter((p) => p.type === ProgressType.LESSON).map((p) => p.lessonId)
  );

  const items: PendingTrainingItem[] = [];

  for (const ch of chapters) {
    if (!doneChapters.has(ch.id)) {
      items.push({ title: ch.title, type: "CHAPTER", url: `${appUrl}/learning-modules/${ch.id}` });
    }
  }
  for (const sop of sops) {
    if (!doneSops.has(sop.id)) {
      items.push({ title: sop.title, type: "SOP", url: `${appUrl}/sops/${sop.id}` });
    }
  }
  for (const quiz of quizzes) {
    if (!doneQuizzes.has(quiz.id)) {
      items.push({ title: quiz.title, type: "QUIZ", url: `${appUrl}/quizzes/${quiz.id}` });
    }
  }
  for (const lesson of lessons) {
    if (!doneLessons.has(lesson.id)) {
      items.push({
        title: lesson.title,
        type: "LESSON",
        url: `${appUrl}/courses/${lesson.module.courseId}/learn`,
      });
    }
  }

  return {
    pendingCount: items.length,
    overallProgress: insights.overallProgress,
    items,
  };
}

export async function sendWeeklyTrainingReminders(options?: {
  force?: boolean;
  userId?: string;
}): Promise<WeeklyReminderResult> {
  const config = getEmailConfig();
  const force = options?.force ?? false;

  const users = await prisma.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      role: { in: LEARNER_ROLES },
      ...(options?.userId ? { id: options.userId } : {}),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      departmentId: true,
    },
  });

  const result: WeeklyReminderResult = {
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (const user of users) {
    result.processed++;

    if (await wasRecentlySent(user.id, force)) {
      result.skipped++;
      result.details.push({ email: user.email, status: "skipped", reason: "Already sent this week" });
      continue;
    }

    const { pendingCount, overallProgress, items } = await getPendingItems(
      user.id,
      user.departmentId,
      config.appUrl
    );

    if (pendingCount === 0) {
      result.skipped++;
      await prisma.emailLog.create({
        data: {
          userId: user.id,
          type: EmailType.WEEKLY_TRAINING_REMINDER,
          toEmail: user.email,
          subject: "Weekly training reminder — all complete",
          status: EmailStatus.SKIPPED,
          metadata: { reason: "no_pending_items", overallProgress },
        },
      });
      result.details.push({ email: user.email, status: "skipped", reason: "All training complete" });
      continue;
    }

    const template = buildWeeklyTrainingReminderEmail({
      firstName: user.firstName,
      appName: config.appName,
      appUrl: config.appUrl,
      overallProgress,
      pendingCount,
      pendingItems: items,
    });

    const log = await prisma.emailLog.create({
      data: {
        userId: user.id,
        type: EmailType.WEEKLY_TRAINING_REMINDER,
        toEmail: user.email,
        subject: template.subject,
        status: EmailStatus.PENDING,
        metadata: { pendingCount, overallProgress },
      },
    });

    const sendResult = await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (sendResult.success && sendResult.mode === "smtp") {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: EmailStatus.SENT, sentAt: new Date() },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.LEARNING_REMINDER,
          title: "Weekly training reminder",
          message: `You have ${pendingCount} training module${pendingCount === 1 ? "" : "s"} to complete. Progress: ${overallProgress}%.`,
          link: "/dashboard",
        },
      });

      result.sent++;
      result.details.push({ email: user.email, status: "sent" });
    } else if (sendResult.success && sendResult.mode === "console") {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: EmailStatus.SKIPPED,
          error: "SMTP not configured — logged to server console only",
          metadata: { pendingCount, overallProgress, mode: "console" },
        },
      });
      result.skipped++;
      result.details.push({
        email: user.email,
        status: "skipped",
        reason: "SMTP not configured (console mode only)",
      });
    } else {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: EmailStatus.FAILED, error: sendResult.error },
      });
      result.failed++;
      result.details.push({
        email: user.email,
        status: "failed",
        reason: sendResult.error,
      });
    }
  }

  return result;
}
