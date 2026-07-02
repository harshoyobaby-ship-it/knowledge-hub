import { apiError, apiSuccess, handleApiError, requireAuth } from "@/lib/api-helpers";
import { getTokenFromRequest } from "@/lib/auth";
import { ragJson } from "@/lib/rag-client";
import { z } from "zod";

const chatSchema = z.object({
  question: z.string().min(1),
  top_k: z.number().int().min(1).max(10).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof Response) return user;

    const token = await getTokenFromRequest(request);
    if (!token) return apiError("Unauthorized", 401);

    const body = await request.json();
    const data = chatSchema.parse(body);

    const result = await ragJson<{ answer: string; sources: unknown[] }>(
      "/api/v1/chat",
      token,
      {
        method: "POST",
        body: JSON.stringify({ question: data.question, top_k: data.top_k ?? 3 }),
      }
    );

    return apiSuccess({ ...result, user });
  } catch (error) {
    return handleApiError(error);
  }
}

