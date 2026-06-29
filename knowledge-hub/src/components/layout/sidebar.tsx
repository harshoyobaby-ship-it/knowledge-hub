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
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@prisma/client";

const learnerItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
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
  { href: "/admin", label: "Admin Panel", icon: Shield, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
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

export function Sidebar({ collapsed, onToggle, userRole }: SidebarProps) {
  const pathname = usePathname();
  const visiblePanels = panelItems.filter((item) => roleMatches(userRole, item.roles));

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-muted px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Kharesiya</p>
            <p className="truncate text-xs text-sidebar-foreground/60">Enterprise LMS</p>
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
        {learnerItems.map((item) => {
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
