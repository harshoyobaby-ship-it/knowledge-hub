import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { forgotPasswordSchema } from "@/lib/validations";
import { isDatabaseConfigured, databaseUnavailableMessage } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import { getEmailConfig } from "@/lib/email/config";

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return apiError(databaseUnavailableMessage(), 503);
    }

    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (user && user.status === "ACTIVE") {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });

      const config = getEmailConfig();
      const resetUrl = `${config.appUrl}/reset-password?token=${token}`;

      await sendEmail({
        to: user.email,
        subject: `Reset your ${config.appName} password`,
        html: `<p>Hi ${user.firstName},</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour.</p>`,
        text: `Reset your password: ${resetUrl}`,
      });
    }

    return apiSuccess({
      message:
        "If an account exists with that email, a password reset link has been sent.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
