import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  handleApiError,
  requireAuth,
} from "@/lib/api-helpers";
import { demoUser } from "@/lib/demo-data";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    if (auth.userId === "demo-user") {
      return apiSuccess({
        id: demoUser.userId,
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        role: demoUser.role,
        jobTitle: demoUser.jobTitle,
        department: demoUser.department,
        unreadNotifications: demoUser.unreadNotifications,
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          status: true,
          jobTitle: true,
          phone: true,
          lastLoginAt: true,
          createdAt: true,
          department: {
            select: {
              id: true,
              name: true,
              description: true,
              logo: true,
              status: true,
            },
          },
        },
      });

      if (!user) {
        return apiSuccess({
          id: auth.userId,
          email: auth.email,
          firstName: auth.firstName,
          lastName: auth.lastName,
          role: auth.role,
        });
      }

      return apiSuccess(user);
    } catch {
      return apiSuccess({
        id: auth.userId,
        email: auth.email,
        firstName: auth.firstName,
        lastName: auth.lastName,
        role: auth.role,
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
