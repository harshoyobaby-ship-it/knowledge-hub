import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requirePermission,
  createAuditLog,
} from "@/lib/api-helpers";
import { departmentSchema } from "@/lib/validations";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_DEPARTMENTS");
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const data = departmentSchema.partial().parse(await request.json());

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.headId !== undefined && { headId: data.headId }),
        ...(data.logo !== undefined && { logo: data.logo }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    await createAuditLog({
      userId: auth.userId,
      action: "UPDATE",
      entityType: "Department",
      entityId: department.id,
    });

    return apiSuccess(department);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, "MANAGE_DEPARTMENTS");
    if (auth instanceof Response) return auth;

    const { id } = await params;

    const department = await prisma.department.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    await createAuditLog({
      userId: auth.userId,
      action: "ARCHIVE",
      entityType: "Department",
      entityId: department.id,
    });

    return apiSuccess({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
