import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
} from "@/lib/api-helpers";
import { getContentManager, canAccessDepartment } from "@/lib/content";
import { questionSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_CONTENT");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { id } = await params;
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) return apiError("Quiz not found", 404);
    if (!canAccessDepartment(ctx, quiz.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const questions = await prisma.question.findMany({
      where: { quizId: id },
      orderBy: { order: "asc" },
    });

    return apiSuccess(questions);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_CONTENT");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { id } = await params;
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) return apiError("Quiz not found", 404);
    if (!canAccessDepartment(ctx, quiz.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const data = questionSchema.parse(body);

    const question = await prisma.question.create({
      data: {
        quizId: id,
        type: data.type,
        text: data.text,
        options: data.options ?? undefined,
        correctAnswer: data.correctAnswer,
        points: data.points ?? 1,
        order: data.order,
        explanation: data.explanation,
      },
    });

    return apiSuccess(question, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_CONTENT");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("Forbidden", 403);

    const { id } = await params;
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) return apiError("Quiz not found", 404);
    if (!canAccessDepartment(ctx, quiz.departmentId)) {
      return apiError("Forbidden", 403);
    }

    const body = await request.json();
    const questions = body.questions as Array<{
      id?: string;
      type: string;
      text: string;
      options?: string[] | null;
      correctAnswer: unknown;
      points?: number;
      order: number;
      explanation?: string | null;
    }>;

    if (!Array.isArray(questions)) {
      return apiError("questions array required", 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.question.deleteMany({ where: { quizId: id } });
      for (const q of questions) {
        const parsed = questionSchema.parse(q);
        await tx.question.create({
          data: {
            quizId: id,
            type: parsed.type,
            text: parsed.text,
            options: parsed.options ?? undefined,
            correctAnswer: parsed.correctAnswer,
            points: parsed.points ?? 1,
            order: parsed.order,
            explanation: parsed.explanation,
          },
        });
      }
    });

    const saved = await prisma.question.findMany({
      where: { quizId: id },
      orderBy: { order: "asc" },
    });

    return apiSuccess(saved);
  } catch (error) {
    return handleApiError(error);
  }
}
