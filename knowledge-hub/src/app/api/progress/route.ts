import { ProgressType } from "@prisma/client";
import { z } from "zod";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
  createAuditLog,
} from "@/lib/api-helpers";
import { markLearningComplete } from "@/lib/insights";
import { prisma } from "@/lib/prisma";

const completeProgressSchema = z
  .object({
    type: z.nativeEnum(ProgressType),
    chapterId: z.string().optional(),
    sopId: z.string().optional(),
    quizId: z.string().optional(),
    score: z.number().min(0).max(100).optional(),
    timeSpentMinutes: z.number().int().min(0).optional(),
  })
  .refine(
    (data) => {
      if (data.type === ProgressType.CHAPTER) return !!data.chapterId;
      if (data.type === ProgressType.SOP) return !!data.sopId;
      if (data.type === ProgressType.QUIZ) return !!data.quizId;
      return false;
    },
    { message: "Missing content ID for progress type" }
  );

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    if (auth.userId === "demo-user") {
      return apiSuccess({ message: "Progress recorded (demo mode)" });
    }

    const body = await request.json();
    const data = completeProgressSchema.parse(body);

    if (data.type === ProgressType.CHAPTER) {
      const chapter = await prisma.knowledgeChapter.findFirst({
        where: { id: data.chapterId, status: "PUBLISHED" },
      });
      if (!chapter) return apiError("Chapter not found", 404);
    } else if (data.type === ProgressType.SOP) {
      const sop = await prisma.sOP.findFirst({
        where: { id: data.sopId, status: "PUBLISHED" },
      });
      if (!sop) return apiError("SOP not found", 404);
    } else if (data.type === ProgressType.QUIZ) {
      const quiz = await prisma.quiz.findFirst({
        where: { id: data.quizId, status: "PUBLISHED" },
      });
      if (!quiz) return apiError("Quiz not found", 404);
    }

    const progress = await markLearningComplete({
      userId: auth.userId,
      type: data.type,
      chapterId: data.chapterId,
      sopId: data.sopId,
      quizId: data.quizId,
      score: data.score,
      timeSpentMinutes: data.timeSpentMinutes,
    });

    await createAuditLog({
      userId: auth.userId,
      action: "UPDATE",
      entityType: "Progress",
      entityId: progress.id,
      details: { type: data.type, completed: true },
    });

    return apiSuccess(progress, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
