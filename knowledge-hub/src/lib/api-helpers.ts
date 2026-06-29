import "@/lib/load-env";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getUserFromRequest } from "./auth";
import type { JWTPayload } from "./auth";
import { hasPermission, hasAnyPermission, type Permission } from "./rbac";
import { prisma } from "./prisma";
import { Prisma, type AuditAction } from "@prisma/client";
import { isDatabaseConfigured } from "./db";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return apiError(error.issues.map((e) => e.message).join(", "), 422);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P1001" || error.code === "P1013") {
      return apiError("Database connection failed. Please try again or contact support.", 503);
    }
  }
  if (error instanceof Error) {
    if (error.message.includes("Invalid URL") || error.message.includes("ENOTFOUND")) {
      return apiError("Database connection failed. Restart the server after updating .env.", 503);
    }
  }
  console.error("API Error:", error);
  return apiError("Internal server error", 500);
}

export async function requireAuth(
  request: Request
): Promise<JWTPayload | NextResponse> {
  const user = await getUserFromRequest(request);
  if (!user) return apiError("Unauthorized", 401);
  return user;
}

export async function requirePermission(
  request: Request,
  permission: Permission
): Promise<JWTPayload | NextResponse> {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;
  if (!hasPermission(user, permission)) {
    return apiError("Forbidden", 403);
  }
  return user;
}

export async function requireAnyPermission(
  request: Request,
  permissions: Permission[]
): Promise<JWTPayload | NextResponse> {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;
  if (!hasAnyPermission(user, permissions)) {
    return apiError("Forbidden", 403);
  }
  return user;
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
  );
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const skip = (page - 1) * limit;
  return { page, limit, sortBy, sortOrder, skip };
}

export async function createAuditLog(params: {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  if (!isDatabaseConfigured()) return;
  try {
    await prisma.auditLog.create({
      data: {
        ...params,
        details: params.details as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
}
