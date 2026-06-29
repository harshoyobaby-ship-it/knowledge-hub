import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import {
  apiSuccess,
  apiError,
  handleApiError,
  createAuditLog,
} from "@/lib/api-helpers";
import { resetPasswordSchema } from "@/lib/validations";
import { isDatabaseConfigured, databaseUnavailableMessage } from "@/lib/db";

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return apiError(databaseUnavailableMessage(), 503);
    }

    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return apiError("Invalid or expired reset token", 400);
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await createAuditLog({
      userId: resetToken.userId,
      action: "UPDATE",
      entityType: "User",
      entityId: resetToken.userId,
      details: { action: "password_reset" },
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return apiSuccess({ message: "Password reset successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
