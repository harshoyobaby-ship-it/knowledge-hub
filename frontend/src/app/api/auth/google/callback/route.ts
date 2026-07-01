import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { establishLoginSession } from "@/lib/login-session";
import {
  exchangeGoogleCode,
  getAppBaseUrl,
  GOOGLE_OAUTH_REDIRECT_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  isGoogleAuthConfigured,
} from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";

function loginErrorRedirect(code: string, message?: string): NextResponse {
  const url = new URL("/login", getAppBaseUrl());
  url.searchParams.set("error", code);
  if (message) url.searchParams.set("message", message);
  const response = NextResponse.redirect(url);
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  response.cookies.delete(GOOGLE_OAUTH_REDIRECT_COOKIE);
  return response;
}

export async function GET(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return loginErrorRedirect("google_not_configured");
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return loginErrorRedirect("google_denied");
  }

  if (!code || !state) {
    return loginErrorRedirect("google_invalid");
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const postLoginRedirect = cookieStore.get(GOOGLE_OAUTH_REDIRECT_COOKIE)?.value || "/dashboard";

  if (!savedState || savedState !== state) {
    return loginErrorRedirect("google_state");
  }

  try {
    const profile = await exchangeGoogleCode(code);

    if (!profile.email_verified || !profile.email) {
      return loginErrorRedirect("google_unverified");
    }

    const user = await prisma.user.findUnique({
      where: { email: profile.email.toLowerCase() },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      return loginErrorRedirect(
        "google_no_account",
        "No active account found for this Google email. Ask your administrator to invite you first."
      );
    }

    const result = await establishLoginSession({
      user,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      method: "google",
      avatarUrl: profile.picture,
    });

    const response =
      "requiresDepartment" in result
        ? loginErrorRedirect(
            "google_department",
            "Please sign in with email and password to select your department."
          )
        : NextResponse.redirect(new URL(result.redirectTo || postLoginRedirect, getAppBaseUrl()));

    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    response.cookies.delete(GOOGLE_OAUTH_REDIRECT_COOKIE);
    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return loginErrorRedirect("google_failed");
  }
}
