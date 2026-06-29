import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
} from "@/lib/api-helpers";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const read = body.read !== false;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: auth.userId },
    });
    if (!notification) return apiError("Not found", 404);

    const updated = await prisma.notification.update({
      where: { id },
      data: { read },
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
