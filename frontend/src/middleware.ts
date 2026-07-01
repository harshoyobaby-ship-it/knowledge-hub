import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { UserRole } from "@prisma/client";
import { expandRoleEquivalents, hasAnyPermissionForRole } from "@/lib/rbac";
import { homePathForRole } from "@/lib/founder";
import {
  isPublicPath,
  isAuthenticatedPath,
  matchRouteRule,
} from "@/lib/route-access";

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "fallback-secret-key"
  );
}

async function getUserFromToken(token: string): Promise<{ role: UserRole } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return { role: payload.role as UserRole };
  } catch {
    return null;
  }
}

function forbiddenRedirect(request: NextRequest, role?: UserRole) {
  const url = new URL(homePathForRole(role ?? UserRole.EMPLOYEE), request.url);
  url.searchParams.set("error", "forbidden");
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("kh_auth_token")?.value;
  const isPublic = isPublicPath(pathname);

  if (pathname === "/register") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && (pathname === "/login" || pathname === "/forgot-password" || pathname === "/reset-password")) {
    const user = await getUserFromToken(token);
    return NextResponse.redirect(new URL(homePathForRole(user?.role ?? UserRole.EMPLOYEE), request.url));
  }

  if (token && pathname === "/hr/login") {
    const user = await getUserFromToken(token);
    return NextResponse.redirect(new URL(homePathForRole(user?.role ?? UserRole.EMPLOYEE), request.url));
  }

  if (!token && isAuthenticatedPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!token && !isPublic && !isAuthenticatedPath(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token) {
    const user = await getUserFromToken(token);
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const roles = expandRoleEquivalents(user.role);

    if (user.role === UserRole.HR && pathname === "/dashboard") {
      return NextResponse.redirect(new URL("/hr", request.url));
    }

    if (
      (user.role === UserRole.MANAGER || user.role === UserRole.DEPARTMENT_HEAD) &&
      pathname === "/dashboard"
    ) {
      return NextResponse.redirect(new URL("/manager", request.url));
    }

    if (roles.includes(UserRole.GUEST) && !isPublic && isAuthenticatedPath(pathname)) {
      return forbiddenRedirect(request, user.role);
    }

    const rule = matchRouteRule(pathname);
    if (rule) {
      const allowed = hasAnyPermissionForRole(user.role, rule.permissions);
      if (!allowed) {
        return forbiddenRedirect(request, user.role);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
