import { z } from "zod";
import { UserRole } from "@prisma/client";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/[0-9]/, "Must contain number"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const courseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional(),
  estimatedHours: z.number().min(0.5).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  isSelfPaced: z.boolean().optional(),
});

export const updateCourseSchema = courseSchema.partial();

export const moduleSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export const lessonSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  contentType: z.enum(["TEXT", "VIDEO", "PDF", "DOCUMENT", "PPT"]).optional(),
  durationMinutes: z.number().int().min(1).optional(),
  order: z.number().int().min(0).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type CourseInput = z.infer<typeof courseSchema>;
export type ModuleInput = z.infer<typeof moduleSchema>;
export type LessonInput = z.infer<typeof lessonSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  departmentId: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain uppercase letter")
      .regex(/[a-z]/, "Must contain lowercase letter")
      .regex(/[0-9]/, "Must contain number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain uppercase letter")
      .regex(/[a-z]/, "Must contain lowercase letter")
      .regex(/[0-9]/, "Must contain number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const userSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.nativeEnum(UserRole),
  departmentId: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  password: z.string().min(8).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

export const createUserSchema = userSchema.extend({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/[0-9]/, "Must contain number"),
}).refine(
  (data) => {
    const needsDept: UserRole[] = [
      UserRole.EMPLOYEE,
      UserRole.STUDENT,
      UserRole.DEPARTMENT_HEAD,
      UserRole.MANAGER,
      UserRole.TRAINER,
    ];
    if (needsDept.includes(data.role) && !data.departmentId) return false;
    return true;
  },
  { message: "Department is required for this role", path: ["departmentId"] }
);

export const updateUserSchema = userSchema.partial().extend({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

export const departmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  headId: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const chapterFields = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  content: z.string().min(1),
  founderNotes: z.string().optional().nullable(),
  references: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  publishToAllDepartments: z.boolean().optional(),
});

export const chapterSchema = chapterFields.refine(
  (data) => data.publishToAllDepartments || (data.departmentId && data.departmentId.length > 0),
  {
    message: "Select a department or publish to all departments",
    path: ["departmentId"],
  }
);

export const updateChapterSchema = chapterFields.partial().extend({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
});

export const createSOPSchema = z.object({
  title: z.string().min(1).max(200),
  departmentId: z.string().min(1),
  effectiveDate: z.string().or(z.date()),
  reviewDate: z.string().or(z.date()).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export const updateSOPSchema = createSOPSchema.partial();

export const createQuizSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  passingPercentage: z.number().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).optional(),
  timeLimitMinutes: z.number().int().min(1).optional().nullable(),
  certificateEligible: z.boolean().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export const updateQuizSchema = createQuizSchema.partial();

export const learningPathSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  durationDays: z.number().int().min(1).optional(),
  departmentId: z.string().optional().nullable(),
  passingScore: z.number().min(0).max(100).optional(),
  autoEnroll: z.boolean().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export const sopSchema = z.object({
  title: z.string().min(1).max(200),
  departmentId: z.string().min(1),
  effectiveDate: z.string().or(z.date()),
  reviewDate: z.string().or(z.date()).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export const quizSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  passingPercentage: z.number().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).optional(),
  timeLimitMinutes: z.number().int().min(1).optional().nullable(),
  certificateEligible: z.boolean().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export const questionSchema = z.object({
  type: z.enum(["MULTIPLE_CHOICE", "SINGLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"]),
  text: z.string().min(1),
  options: z.array(z.string()).optional().nullable(),
  correctAnswer: z.union([z.string(), z.array(z.string()), z.boolean()]),
  points: z.number().int().min(1).optional(),
  order: z.number().int().min(0),
  explanation: z.string().optional().nullable(),
});

export const attachmentInputSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
  url: z.string().min(1),
});

export const departmentTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  departmentId: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  attachments: z.array(attachmentInputSchema).optional(),
});

export const updateDepartmentTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(["ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  note: z.string().optional().nullable(),
});

export type DepartmentTaskInput = z.infer<typeof departmentTaskSchema>;
export type UpdateDepartmentTaskInput = z.infer<typeof updateDepartmentTaskSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;
export type ChapterInput = z.infer<typeof chapterSchema>;
export type LearningPathInput = z.infer<typeof learningPathSchema>;
export type SOPInput = z.infer<typeof sopSchema>;
export type QuizInput = z.infer<typeof quizSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
