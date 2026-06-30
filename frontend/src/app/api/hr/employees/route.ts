import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
} from "@/lib/api-helpers";
import { getEmployeesProgress } from "@/lib/hr-progress";

export async function GET(request: Request) {
  try {
    const auth = await requirePermission(request, "ACCESS_HR_DASHBOARD");
    if (auth instanceof Response) return auth;

    const employees = await getEmployeesProgress();
    return apiSuccess(employees);
  } catch (error) {
    return handleApiError(error);
  }
}
