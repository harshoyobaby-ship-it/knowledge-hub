import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
} from "@/lib/api-helpers";
import { getContentManager, departmentFilter } from "@/lib/content";
import { getEmployeeProgressDetail } from "@/lib/hr-progress";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "VIEW_TEAM_PROGRESS");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("No department assigned to your manager account", 403);

    const deptFilter = departmentFilter(ctx);
    const departmentId = deptFilter.departmentId as string | undefined;

    const { id } = await params;
    const detail = await getEmployeeProgressDetail(
      id,
      departmentId ? { departmentId } : undefined
    );

    if (!detail) {
      return apiError("Employee not found in your department", 404);
    }

    return apiSuccess(detail);
  } catch (error) {
    return handleApiError(error);
  }
}
