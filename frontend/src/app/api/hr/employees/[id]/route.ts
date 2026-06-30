import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
} from "@/lib/api-helpers";
import { getEmployeeProgressDetail } from "@/lib/hr-progress";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "ACCESS_HR_DASHBOARD");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const detail = await getEmployeeProgressDetail(id);

    if (!detail) {
      return apiError("Employee not found", 404);
    }

    return apiSuccess(detail);
  } catch (error) {
    return handleApiError(error);
  }
}
