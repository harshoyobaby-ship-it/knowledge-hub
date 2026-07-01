import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  apiSuccess,
  apiError,
  handleApiError,
  requireAuth,
} from "@/lib/api-helpers";
import { hasPermission } from "@/lib/rbac";
import { LessonContentType } from "@prisma/client";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES: Record<string, LessonContentType> = {
  "video/mp4": "VIDEO",
  "video/webm": "VIDEO",
  "application/pdf": "PDF",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPT",
  "application/msword": "DOCUMENT",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCUMENT",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "DOCUMENT",
  "application/vnd.ms-excel": "DOCUMENT",
  "text/plain": "DOCUMENT",
  "text/csv": "DOCUMENT",
};

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const canUpload =
      hasPermission(auth, "MANAGE_COURSES") ||
      hasPermission(auth, "MANAGE_CONTENT") ||
      hasPermission(auth, "ASSIGN_FOUNDER_TASKS");
    if (!canUpload) return apiError("Forbidden", 403);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return apiError("No file provided", 400);

    if (file.size > MAX_SIZE) {
      return apiError("File too large (max 50MB)", 400);
    }

    const resourceType = ALLOWED_TYPES[file.type];
    if (!resourceType) {
      return apiError("Unsupported file type. Upload video, PDF, PPT, or document.", 400);
    }

    const ext = path.extname(file.name) || "";
    const filename = `${randomUUID()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    return apiSuccess({
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url: `/uploads/${filename}`,
      resourceType,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
