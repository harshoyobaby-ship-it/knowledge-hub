import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
} from "@/lib/api-helpers";
import { getContentManager, departmentFilter } from "@/lib/content";
import { getEmployeesProgress, getEmployeeProgressDetail } from "@/lib/hr-progress";

export async function GET(request: Request) {
  try {
    const auth = await requirePermission(request, "VIEW_TEAM_PROGRESS");
    if (auth instanceof Response) return auth;

    const ctx = await getContentManager(auth);
    if (!ctx) return apiError("No department assigned to your manager account", 403);

    const deptFilter = departmentFilter(ctx);
    const departmentId = deptFilter.departmentId as string | undefined;

    if (!departmentId && !ctx.canManageAll) {
      return apiError("No department assigned to your manager account", 403);
    }

    const employees = await getEmployeesProgress(
      departmentId ? { departmentId } : undefined
    );

    const department = departmentId
      ? await prisma.department.findUnique({
          where: { id: departmentId },
          select: { id: true, name: true },
        })
      : null;

    return apiSuccess({ department, employees });
  } catch (error) {
    return handleApiError(error);
  }
}
