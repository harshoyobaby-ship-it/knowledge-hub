import { NextResponse } from "next/server";
import {
  buildGoogleAuthUrl,
  createOAuthState,
  getAppBaseUrl,
  GOOGLE_OAUTH_REDIRECT_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  isGoogleAuthConfigured,
} from "@/lib/google-auth";

export async function GET(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get("redirect") || "/dashboard";
  const state = createOAuthState();

  const response = NextResponse.redirect(buildGoogleAuthUrl(state));
  const secure = getAppBaseUrl().startsWith("https://");

  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  response.cookies.set(GOOGLE_OAUTH_REDIRECT_COOKIE, redirect, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}
