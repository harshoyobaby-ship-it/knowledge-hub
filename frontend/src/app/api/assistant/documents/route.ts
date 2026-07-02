import { apiError, apiSuccess, handleApiError, requireAuth } from "@/lib/api-helpers";
import { getTokenFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { ragFetch } from "@/lib/rag-client";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    if (!hasPermission(auth, "USE_AI_CHAT")) {
      return apiError("Forbidden", 403);
    }

    const token = await getTokenFromRequest(request);
    if (!token) return apiError("Unauthorized", 401);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return apiError("No file provided", 400);
    }

    const title = formData.get("title");
    const departmentId = formData.get("departmentId");

    const ragForm = new FormData();
    ragForm.append("file", file);
    if (typeof title === "string" && title.trim()) {
      ragForm.append("title", title.trim());
    }
    if (typeof departmentId === "string" && departmentId.trim()) {
      ragForm.append("department_id", departmentId.trim());
    } else if (auth.departmentId) {
      ragForm.append("department_id", auth.departmentId);
    }

    const response = await ragFetch("/api/v1/documents/upload", token, {
      method: "POST",
      body: ragForm,
    });

    const json = await response.json();
    if (!response.ok) {
      const detail =
        typeof json?.detail === "string"
          ? json.detail
          : Array.isArray(json?.detail)
            ? json.detail.map((d: { msg?: string }) => d.msg).join(", ")
            : "Upload failed";
      return apiError(detail, response.status);
    }

    return apiSuccess(json, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
