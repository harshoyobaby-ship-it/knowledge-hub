import { apiError, apiSuccess, handleApiError, requireAuth } from "@/lib/api-helpers";
import { getTokenFromRequest } from "@/lib/auth";
import { getRagHealth, getRagSession } from "@/lib/rag-client";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    if (user instanceof Response) return user;

    const token = await getTokenFromRequest(request);
    if (!token) return apiError("Unauthorized", 401);

    const [ragHealth, ragSession] = await Promise.all([
      getRagHealth(),
      getRagSession(token),
    ]);

    return apiSuccess({
      user,
      rag: {
        health: ragHealth,
        session: ragSession,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
