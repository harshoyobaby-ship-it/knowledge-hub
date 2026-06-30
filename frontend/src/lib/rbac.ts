import { UserRole } from "@prisma/client";
import type { JWTPayload } from "./auth";

/** Legacy roles map to enterprise equivalents for permission checks. */
export function expandRoleEquivalents(role: UserRole): UserRole[] {
  switch (role) {
    case UserRole.DEPARTMENT_HEAD:
      return [role, UserRole.MANAGER];
    case UserRole.MANAGER:
      return [role, UserRole.DEPARTMENT_HEAD];
    case UserRole.STUDENT:
      return [role, UserRole.EMPLOYEE];
    case UserRole.GUEST:
      return [role, UserRole.STUDENT];
    default:
      return [role];
  }
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 8,
  ADMIN: 7,
  HR: 6,
  MANAGER: 5,
  DEPARTMENT_HEAD: 5,
  TRAINER: 4,
  EMPLOYEE: 3,
  STUDENT: 2,
  GUEST: 1,
};

const LEARNER_ROLES: UserRole[] = [
  UserRole.EMPLOYEE,
  UserRole.STUDENT,
  UserRole.GUEST,
];

const CONTENT_MANAGERS: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.HR,
  UserRole.MANAGER,
  UserRole.DEPARTMENT_HEAD,
  UserRole.TRAINER,
];

const COURSE_MANAGERS: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.HR,
  UserRole.MANAGER,
  UserRole.DEPARTMENT_HEAD,
  UserRole.TRAINER,
];

export const PERMISSIONS = {
  MANAGE_SYSTEM: [UserRole.SUPER_ADMIN],
  MANAGE_DEPARTMENTS: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  MANAGE_USERS: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR],
  MANAGE_ALL_CONTENT: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  MANAGE_CONTENT: CONTENT_MANAGERS,
  MANAGE_COURSES: COURSE_MANAGERS,
  MANAGE_LEARNING_PATHS: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DEPARTMENT_HEAD],
  MANAGE_CERTIFICATES: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR],
  MANAGE_ASSIGNMENTS: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRAINER, UserRole.MANAGER, UserRole.DEPARTMENT_HEAD],
  GRADE_ASSIGNMENTS: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRAINER, UserRole.MANAGER, UserRole.DEPARTMENT_HEAD],
  ENROLL_COURSES: [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.HR,
    UserRole.MANAGER,
    UserRole.DEPARTMENT_HEAD,
    UserRole.TRAINER,
    UserRole.EMPLOYEE,
    UserRole.STUDENT,
  ],
  VIEW_LEARNING_CONTENT: [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.HR,
    UserRole.MANAGER,
    UserRole.DEPARTMENT_HEAD,
    UserRole.TRAINER,
    UserRole.EMPLOYEE,
    UserRole.STUDENT,
  ],
  MANAGE_DEPARTMENT_CONTENT: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.DEPARTMENT_HEAD],
  UPLOAD_SOPS: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.DEPARTMENT_HEAD, UserRole.TRAINER],
  CREATE_QUIZZES: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.DEPARTMENT_HEAD, UserRole.TRAINER],
  TAKE_QUIZZES: [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.HR,
    UserRole.MANAGER,
    UserRole.DEPARTMENT_HEAD,
    UserRole.TRAINER,
    UserRole.EMPLOYEE,
    UserRole.STUDENT,
  ],
  VIEW_ALL_PROGRESS: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR],
  VIEW_DEPARTMENT_ANALYTICS: [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.HR,
    UserRole.MANAGER,
    UserRole.DEPARTMENT_HEAD,
  ],
  VIEW_TEAM_PROGRESS: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DEPARTMENT_HEAD],
  MANAGE_ONBOARDING: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR],
  ACCESS_SUPER_ADMIN_PANEL: [UserRole.SUPER_ADMIN],
  ACCESS_ADMIN_PANEL: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  ACCESS_HR_DASHBOARD: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR],
  ACCESS_TRAINER_PANEL: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRAINER],
  ACCESS_MANAGER_PANEL: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.DEPARTMENT_HEAD],
  MANAGE_NOTIFICATIONS: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR],
  USE_AI_CHAT: [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.HR,
    UserRole.MANAGER,
    UserRole.DEPARTMENT_HEAD,
    UserRole.TRAINER,
    UserRole.EMPLOYEE,
    UserRole.STUDENT,
  ],
  MANAGE_RAG: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  VIEW_AUDIT_LOGS: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  EXPORT_REPORTS: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DEPARTMENT_HEAD],
} satisfies Record<string, UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermissionForRole(
  role: UserRole,
  permission: Permission
): boolean {
  const allowed = PERMISSIONS[permission] as readonly UserRole[];
  return expandRoleEquivalents(role).some((r) => allowed.includes(r));
}

export function hasAnyPermissionForRole(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermissionForRole(role, p));
}

export function hasPermission(
  user: JWTPayload | null,
  permission: Permission
): boolean {
  if (!user) return false;
  const allowed = PERMISSIONS[permission] as readonly UserRole[];
  return expandRoleEquivalents(user.role).some((r) => allowed.includes(r));
}

export function hasAnyPermission(
  user: JWTPayload | null,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

export function hasRole(user: JWTPayload | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return expandRoleEquivalents(user.role).some((r) => roles.includes(r));
}

export function isSuperAdmin(user: JWTPayload | null): boolean {
  return hasRole(user, [UserRole.SUPER_ADMIN]);
}

export function isAdmin(user: JWTPayload | null): boolean {
  return hasRole(user, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
}

export function isHR(user: JWTPayload | null): boolean {
  return hasRole(user, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR]);
}

export function isManager(user: JWTPayload | null): boolean {
  return hasRole(user, [UserRole.MANAGER, UserRole.DEPARTMENT_HEAD]);
}

export function isTrainer(user: JWTPayload | null): boolean {
  return hasRole(user, [UserRole.TRAINER]);
}

export function isLearner(user: JWTPayload | null): boolean {
  return hasRole(user, LEARNER_ROLES);
}

export function canManageContent(user: JWTPayload | null): boolean {
  return hasPermission(user, "MANAGE_CONTENT");
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
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
  return labels[role] ?? role;
}
