import { apiSuccess, handleApiError, requireAuth } from "@/lib/api-helpers";
import { computeUserInsights } from "@/lib/insights";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    if (auth.userId === "demo-user") {
      return apiSuccess({
        totalModules: 0,
        completedModules: 0,
        pendingModules: 0,
        overallProgress: 0,
        chaptersCompleted: 0,
        sopsCompleted: 0,
        quizzesCompleted: 0,
        totalChapters: 0,
        totalSOPs: 0,
        totalQuizzes: 0,
        timeSpentMinutes: 0,
        quizScores: [],
        recentCompletions: [],
        weeklyProgress: Array.from({ length: 8 }, (_, i) => ({
          week: `W${i + 1}`,
          completed: 0,
        })),
        departmentProgress: [],
      });
    }

    const insights = await computeUserInsights(auth.userId, auth);
    return apiSuccess(insights);
  } catch (error) {
    return handleApiError(error);
  }
}
