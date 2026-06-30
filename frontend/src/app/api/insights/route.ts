import { ProgressType } from "@prisma/client";
import { apiSuccess, handleApiError, requireAuth } from "@/lib/api-helpers";
import { demoDashboard } from "@/lib/demo-data";
import { computeUserInsights } from "@/lib/insights";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    if (auth.userId === "demo-user") {
      return apiSuccess({
        totalModules: demoDashboard.totalModules,
        completedModules: demoDashboard.completedModules,
        pendingModules: demoDashboard.pendingModules,
        overallProgress: demoDashboard.overallProgress,
        chaptersCompleted: 10,
        sopsCompleted: 4,
        quizzesCompleted: 2,
        totalChapters: 12,
        totalSOPs: 6,
        totalQuizzes: 5,
        timeSpentMinutes: 320,
        quizScores: demoDashboard.quizScores.map((quiz, index) => ({
          quizId: String(index + 1),
          quizTitle: quiz.quizTitle,
          score: quiz.score,
          passed: quiz.passed,
        })),
        recentCompletions: demoDashboard.recentChapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          type: ProgressType.CHAPTER,
          completedAt: chapter.updatedAt,
        })),
        weeklyProgress: demoDashboard.weeklyProgress,
        departmentProgress: [
          {
            departmentId: "dept-ops",
            name: "Operations",
            completed: 16,
            total: 24,
            progress: 67,
          },
        ],
      });
    }

    const insights = await computeUserInsights(auth.userId, auth);
    return apiSuccess(insights);
  } catch (error) {
    return handleApiError(error);
  }
}
