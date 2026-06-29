import { NextResponse } from "next/server";
import { createToken, setAuthCookie } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-helpers";
import { UserRole } from "@prisma/client";

export async function POST() {
  try {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      return NextResponse.json(
        { success: false, error: "Demo login is not enabled" },
        { status: 403 }
      );
    }

    const token = await createToken({
      userId: "demo-user",
      email: "demo@kharesiya.com",
      role: UserRole.EMPLOYEE,
      firstName: "Alex",
      lastName: "Johnson",
    });

    await setAuthCookie(token);

    return apiSuccess({
      user: {
        id: "demo-user",
        email: "demo@kharesiya.com",
        firstName: "Alex",
        lastName: "Johnson",
        role: UserRole.EMPLOYEE,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
