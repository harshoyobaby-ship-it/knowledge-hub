import { UserRole } from "@prisma/client";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DashboardStats {
  totalModules: number;
  completedModules: number;
  pendingModules: number;
  overallProgress: number;
  quizScores: { quizTitle: string; score: number; passed: boolean }[];
  recentChapters: { id: string; title: string; updatedAt: string }[];
  recentSOPs: { id: string; title: string; updatedAt: string }[];
}

export interface AdminStats {
  totalUsers: number;
  totalDepartments: number;
  totalChapters: number;
  totalSOPs: number;
  totalQuizzes: number;
  completionRate: number;
}

export interface HRStats {
  employeeCount: number;
  departmentDistribution: { name: string; count: number }[];
  completionRates: { department: string; rate: number }[];
  overdueLearning: number;
  topPerformers: { name: string; progress: number }[];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  HR: "HR",
  MANAGER: "Manager",
  DEPARTMENT_HEAD: "Manager",
  TRAINER: "Trainer",
  EMPLOYEE: "Employee",
  STUDENT: "Student",
  GUEST: "Guest",
};

export const DIFFICULTY_LABELS = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

export const STATUS_LABELS = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export const TASK_STATUS_LABELS = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const TASK_PRIORITY_LABELS = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};
