import { apiError, apiSuccess, handleApiError, requirePermission } from "@/lib/api-helpers";
import { getTokenFromRequest } from "@/lib/auth";
import { ragFetch, ragJson } from "@/lib/rag-client";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const auth = await requirePermission(_request, "MANAGE_RAG");
    if (auth instanceof Response) return auth;

    const token = await getTokenFromRequest(_request);
    if (!token) return apiError("Unauthorized", 401);

    const { id } = await params;
    const result = await ragJson<unknown>(
      `/api/v1/sync/documents/${encodeURIComponent(id)}/reindex`,
      token,
      { method: "POST" }
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requirePermission(_request, "MANAGE_RAG");
    if (auth instanceof Response) return auth;

    const token = await getTokenFromRequest(_request);
    if (!token) return apiError("Unauthorized", 401);

    const { id } = await params;
    const response = await ragFetch(
      `/api/v1/sync/documents/${encodeURIComponent(id)}`,
      token,
      { method: "DELETE" }
    );

    if (!response.ok) {
      const detail = await response.text();
      return apiError(detail || "Delete failed", response.status);
    }

    return apiSuccess({ deleted: id });
  } catch (error) {
    return handleApiError(error);
  }
}
