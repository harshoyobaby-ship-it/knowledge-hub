import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  handleApiError,
  requireAuth,
  parsePagination,
} from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const unreadOnly = searchParams.get("unread") === "true";

    const where = {
      userId: auth.userId,
      ...(unreadOnly && { read: false }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: auth.userId, read: false } }),
    ]);

    return apiSuccess({
      data: notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
