import {
  apiSuccess,
  apiError,
  handleApiError,
} from "@/lib/api-helpers";
import { getCronSecret } from "@/lib/email/config";
import { sendWeeklyTrainingReminders } from "@/lib/email/training-reminders";

async function runWeeklyReminders(request: Request) {
  const secret = getCronSecret();
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const headerSecret = request.headers.get("x-cron-secret");

  if (!secret) {
    return apiError("CRON_SECRET is not configured", 503);
  }

  if (bearer !== secret && headerSecret !== secret) {
    return apiError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  const result = await sendWeeklyTrainingReminders({ force });

  return apiSuccess({
    message: "Weekly training reminders processed",
    ...result,
  });
}

export async function GET(request: Request) {
  try {
    return await runWeeklyReminders(request);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return await runWeeklyReminders(request);
  } catch (error) {
    return handleApiError(error);
  }
}
