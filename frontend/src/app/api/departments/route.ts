import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
  createAuditLog,
} from "@/lib/api-helpers";
import { getUserFromRequest } from "@/lib/auth";
import { departmentSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    const departments = await prisma.department.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        ...(user && {
          description: true,
          _count: { select: { members: true } },
        }),
      },
      orderBy: { name: "asc" },
    });

    return apiSuccess(departments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, "MANAGE_DEPARTMENTS");
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const data = departmentSchema.parse(body);

    const department = await prisma.department.create({
      data: {
        name: data.name,
        description: data.description,
        headId: data.headId,
        logo: data.logo,
        status: data.status ?? "ACTIVE",
      },
      select: { id: true, name: true, status: true },
    });

    await createAuditLog({
      userId: auth.userId,
      action: "CREATE",
      entityType: "Department",
      entityId: department.id,
    });

    return apiSuccess(department, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
