"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  FileText,
  ClipboardList,
  TrendingUp,
  Bell,
  User,
  Shield,
  Users,
  UserCog,
  Search,
  ChevronLeft,
  GraduationCap,
  FolderOpen,
  Library,
  Route,
  Bot,
  Presentation,
  BarChart3,
  Database,
  Crown,
  ListTodo,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@prisma/client";

const superAdminPanelItems = [
  { href: "/admin", label: "Admin Dashboard", icon: Shield },
  { href: "/admin/users", label: "Members", icon: UserCog },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/admin/rag", label: "Knowledge Index", icon: Database },
  { href: "/admin/email", label: "Email Automation", icon: Mail },
  { href: "/assistant", label: "AI Chat", icon: Bot },
  { href: "/founder", label: "Founder Hub", icon: Crown },
  { href: "/profile", label: "Profile", icon: User },
];

const founderPanelItems = [
  { href: "/founder", label: "Founder Hub", icon: Crown },
  { href: "/admin/content", label: "Publish Knowledge", icon: FolderOpen },
  { href: "/admin/rag", label: "Knowledge Index", icon: Database },
  { href: "/admin/tasks", label: "Assign Tasks", icon: ListTodo },
  { href: "/admin/courses", label: "Courses", icon: GraduationCap },
  { href: "/admin/learning-paths", label: "Learning Paths", icon: Route },
  { href: "/assistant", label: "AI Chat", icon: Bot },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/admin/users", label: "Team Members", icon: UserCog },
  { href: "/profile", label: "Profile", icon: User },
];

const managerPanelItems = [
  { href: "/manager", label: "Manager Dashboard", icon: LayoutDashboard },
  { href: "/manager/tasks", label: "Team Tasks", icon: ListTodo },
  { href: "/department-tasks", label: "Founder Tasks", icon: Crown },
  { href: "/manager/employees", label: "Team Progress", icon: TrendingUp },
  { href: "/admin/content", label: "Department Content", icon: FolderOpen },
  { href: "/admin/courses", label: "Courses", icon: GraduationCap },
  { href: "/admin/learning-paths", label: "Learning Paths", icon: Route },
  { href: "/assistant", label: "AI Chat", icon: Bot },
  { href: "/profile", label: "Profile", icon: User },
];

const hrPanelItems = [
  { href: "/hr", label: "HR Dashboard", icon: LayoutDashboard },
  { href: "/hr/employees", label: "Employee Progress", icon: TrendingUp },
  { href: "/admin/users", label: "Members", icon: UserCog },
  { href: "/admin/email", label: "Email Automation", icon: Mail },
  { href: "/assistant", label: "AI Chat", icon: Bot },
  { href: "/profile", label: "Profile", icon: User },
];

const learnerItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/my-tasks", label: "My Tasks", icon: ListTodo },
  { href: "/department-tasks", label: "Founder Tasks", icon: Crown },
  { href: "/courses", label: "My Courses", icon: Library },
  { href: "/learning-paths", label: "Learning Paths", icon: Route },
  { href: "/learning-modules", label: "Knowledge Base", icon: BookOpen },
  { href: "/sops", label: "SOP Library", icon: FileText },
  { href: "/quizzes", label: "Mock Tests", icon: ClipboardList },
  { href: "/assistant", label: "AI Chat", icon: Bot },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/search", label: "Search", icon: Search },
  { href: "/profile", label: "Profile", icon: User },
];

type PanelItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
};

const panelItems: PanelItem[] = [
  { href: "/admin/rag", label: "Knowledge Index", icon: Database, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  { href: "/admin", label: "Admin Panel", icon: Shield, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  { href: "/admin/tasks", label: "Founder Tasks", icon: ListTodo, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  { href: "/admin/content", label: "Content", icon: FolderOpen, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DEPARTMENT_HEAD, UserRole.TRAINER] },
  { href: "/admin/courses", label: "Courses", icon: GraduationCap, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DEPARTMENT_HEAD, UserRole.TRAINER] },
  { href: "/admin/email", label: "Email Automation", icon: Mail, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR] },
  { href: "/admin/learning-paths", label: "Learning Paths", icon: Route, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DEPARTMENT_HEAD] },
  { href: "/admin/users", label: "Members", icon: UserCog, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR] },
  { href: "/hr", label: "HR Dashboard", icon: Users, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR] },
  { href: "/trainer", label: "Trainer Panel", icon: Presentation, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRAINER] },
  { href: "/manager", label: "Manager Panel", icon: BarChart3, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.DEPARTMENT_HEAD] },
  { href: "/departments", label: "Departments", icon: Building2, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
];

function roleMatches(userRole: UserRole | undefined, allowed: UserRole[]): boolean {
  if (!userRole) return true;
  if (allowed.includes(userRole)) return true;
  if (userRole === UserRole.DEPARTMENT_HEAD && allowed.includes(UserRole.MANAGER)) return true;
  if (userRole === UserRole.MANAGER && allowed.includes(UserRole.DEPARTMENT_HEAD)) return true;
  return false;
}

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  userRole?: UserRole;
}

function isFounderRole(role?: UserRole): boolean {
  return role === UserRole.ADMIN;
}

function isSuperAdminRole(role?: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN;
}

function isManagerRole(role?: UserRole): boolean {
  return role === UserRole.MANAGER || role === UserRole.DEPARTMENT_HEAD;
}

export function Sidebar({ collapsed, onToggle, userRole }: SidebarProps) {
  const pathname = usePathname();
  const isHrPanel = userRole === UserRole.HR;
  const isSuperAdminPanel = isSuperAdminRole(userRole);
  const isFounderPanel = isFounderRole(userRole);
  const isManagerPanel = isManagerRole(userRole);
  const primaryNav = isHrPanel
    ? hrPanelItems
    : isSuperAdminPanel
      ? superAdminPanelItems
    : isFounderPanel
      ? founderPanelItems
      : isManagerPanel
        ? managerPanelItems
        : learnerItems;
  const visiblePanels =
    isHrPanel || isManagerPanel || isFounderPanel || isSuperAdminPanel
      ? []
      : panelItems.filter((item) => roleMatches(userRole, item.roles));

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-muted px-4">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isHrPanel
              ? "bg-emerald-600"
              : isSuperAdminPanel
                ? "bg-violet-600"
              : isFounderPanel
                ? "bg-amber-600"
                : isManagerPanel
                  ? "bg-blue-600"
                  : "bg-sidebar-accent"
          )}
        >
          {isHrPanel ? (
            <Users className="h-5 w-5 text-white" />
          ) : isSuperAdminPanel ? (
            <Shield className="h-5 w-5 text-white" />
          ) : isFounderPanel ? (
            <Crown className="h-5 w-5 text-white" />
          ) : isManagerPanel ? (
            <BarChart3 className="h-5 w-5 text-white" />
          ) : (
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {isHrPanel ? "HR Panel" : isSuperAdminPanel ? "Super Admin" : isFounderPanel ? "Founder Hub" : isManagerPanel ? "Manager Panel" : "Kharesiya"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {isHrPanel
                ? "Employee training oversight"
                : isSuperAdminPanel
                  ? "System administration"
                : isFounderPanel
                  ? "Knowledge for every department"
                  : isManagerPanel
                    ? "Department management"
                    : "Enterprise LMS"}
            </p>
          </div>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className="ml-auto hidden rounded-md p-1 hover:bg-sidebar-muted lg:block"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {!collapsed && (isHrPanel || isSuperAdminPanel || isManagerPanel || isFounderPanel) && (
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            {isHrPanel ? "HR Admin" : isSuperAdminPanel ? "Super Admin" : isFounderPanel ? "Founder" : "Department Manager"}
          </p>
        )}
        {primaryNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {visiblePanels.length > 0 && (
          <>
            {!collapsed && (
              <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                Management
              </p>
            )}
            {visiblePanels.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
}
