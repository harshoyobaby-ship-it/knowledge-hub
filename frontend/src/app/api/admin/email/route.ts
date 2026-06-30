import {
  apiSuccess,
  handleApiError,
  requireAnyPermission,
  parsePagination,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { sendWeeklyTrainingReminders } from "@/lib/email/training-reminders";
import { getEmailConfig } from "@/lib/email/config";

export async function GET(request: Request) {
  try {
    const auth = await requireAnyPermission(request, [
      "ACCESS_ADMIN_PANEL",
      "ACCESS_HR_DASHBOARD",
      "MANAGE_ONBOARDING",
    ]);
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          toEmail: true,
          subject: true,
          status: true,
          error: true,
          sentAt: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.emailLog.count(),
    ]);

    const config = getEmailConfig();

    return apiSuccess({
      config: {
        enabled: config.enabled,
        mode: config.mode,
        from: config.from,
      },
      data: logs,
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
    const auth = await requireAnyPermission(request, [
      "ACCESS_ADMIN_PANEL",
      "ACCESS_HR_DASHBOARD",
      "MANAGE_ONBOARDING",
    ]);
    if (auth instanceof Response) return auth;

    const body = await request.json().catch(() => ({}));
    const force = body.force === true;

    const result = await sendWeeklyTrainingReminders({ force });

    return apiSuccess({
      message: "Weekly training reminders sent",
      ...result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
