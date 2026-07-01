import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  handleApiError,
  requireAuth,
} from "@/lib/api-helpers";
import { getLearnerContentFilter } from "@/lib/department-access";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const deptFilter = await getLearnerContentFilter(auth);

    const chapters = await prisma.knowledgeChapter.findMany({
      where: {
        status: "PUBLISHED",
        founderNotes: { not: null },
        NOT: { founderNotes: "" },
        ...(deptFilter as { departmentId?: string }),
      },
      select: {
        id: true,
        title: true,
        founderNotes: true,
        publishedAt: true,
        category: true,
        department: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 5,
    });

    return apiSuccess(chapters);
  } catch (error) {
    return handleApiError(error);
  }
}
