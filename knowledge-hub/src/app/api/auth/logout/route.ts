import { clearAuthCookie, getUserFromRequest } from "@/lib/auth";
import {
  apiSuccess,
  handleApiError,
  createAuditLog,
} from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    await clearAuthCookie();

    if (user) {
      await createAuditLog({
        userId: user.userId,
        action: "LOGOUT",
        entityType: "User",
        entityId: user.userId,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
      });
    }

    return apiSuccess({ message: "Logged out successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
