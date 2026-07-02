import { apiError, apiSuccess, handleApiError, requirePermission } from "@/lib/api-helpers";
import { getTokenFromRequest } from "@/lib/auth";
import { getRagHealth, ragFetch, ragJson } from "@/lib/rag-client";

export async function GET(request: Request) {
  try {
    const auth = await requirePermission(request, "MANAGE_RAG");
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(request.url);
    if (searchParams.get("scope") === "health") {
      const health = await getRagHealth();
      return apiSuccess(health);
    }

    const token = await getTokenFromRequest(request);
    if (!token) return apiError("Unauthorized", 401);

    const result = await ragJson<{ items: unknown[]; total: number }>(
      "/api/v1/sync/documents",
      token
    );
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, "MANAGE_RAG");
    if (auth instanceof Response) return auth;

    const token = await getTokenFromRequest(request);
    if (!token) return apiError("Unauthorized", 401);

    const formData = await request.formData();
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
    if (!files.length) {
      return apiError("Select at least one file", 400);
    }

    const departmentId = formData.get("departmentId");
    const companyWide = formData.get("companyWide") === "true";

    const ragForm = new FormData();
    for (const file of files) {
      ragForm.append("files", file);
    }
    if (typeof departmentId === "string" && departmentId.trim()) {
      ragForm.append("department_id", departmentId.trim());
    }
    ragForm.append("company_wide", companyWide ? "true" : "false");

    const response = await ragFetch("/api/v1/sync/files", token, {
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
