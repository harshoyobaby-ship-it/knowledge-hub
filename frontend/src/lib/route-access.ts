import type { Permission } from "./rbac";

export interface RouteRule {
  prefix: string;
  permissions: Permission[];
  /** If true, user needs ANY listed permission. Default true. */
  any?: boolean;
}

/** Longest-prefix match wins — keep specific routes before general ones. */
export const ROUTE_RULES: RouteRule[] = [
  { prefix: "/admin/users", permissions: ["MANAGE_USERS"] },
  { prefix: "/admin/content", permissions: ["MANAGE_CONTENT"] },
  { prefix: "/admin/courses", permissions: ["MANAGE_COURSES"] },
  { prefix: "/admin/email", permissions: ["ACCESS_ADMIN_PANEL", "ACCESS_HR_DASHBOARD", "MANAGE_ONBOARDING"] },
  { prefix: "/admin/learning-paths", permissions: ["MANAGE_LEARNING_PATHS"] },
  { prefix: "/admin/quizzes", permissions: ["MANAGE_CONTENT"] },
  { prefix: "/admin/departments", permissions: ["MANAGE_DEPARTMENTS"] },
  { prefix: "/admin", permissions: ["ACCESS_ADMIN_PANEL", "ACCESS_SUPER_ADMIN_PANEL"] },
  { prefix: "/hr", permissions: ["ACCESS_HR_DASHBOARD"] },
  { prefix: "/trainer", permissions: ["ACCESS_TRAINER_PANEL"] },
  { prefix: "/manager", permissions: ["ACCESS_MANAGER_PANEL"] },
  { prefix: "/assistant", permissions: ["USE_AI_CHAT"] },
];

export const PUBLIC_PATHS = [
  "/",
  "/login",
  "/hr/login",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/contact",
  "/public-courses",
];

export const AUTHENTICATED_PREFIXES = [
  "/dashboard",
  "/courses",
  "/departments",
  "/learning-modules",
  "/learning-paths",
  "/sops",
  "/quizzes",
  "/progress",
  "/notifications",
  "/search",
  "/profile",
  "/certificates",
  "/admin",
  "/hr",
  "/trainer",
  "/manager",
  "/assistant",
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`))
  );
}

export function isAuthenticatedPath(pathname: string): boolean {
  return AUTHENTICATED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function matchRouteRule(pathname: string): RouteRule | null {
  const sorted = [...ROUTE_RULES].sort((a, b) => b.prefix.length - a.prefix.length);
  return sorted.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)) ?? null;
}
