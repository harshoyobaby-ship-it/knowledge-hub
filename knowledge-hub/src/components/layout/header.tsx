"use client";

import { useTheme } from "next-themes";
import { Bell, LogOut, Menu, Moon, Sun, User, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { getInitials } from "@/lib/utils";
import Link from "next/link";
import { Search } from "lucide-react";

interface HeaderProps {
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    unreadNotifications?: number;
    department?: { id: string; name: string } | null;
  } | null;
  onMenuClick?: () => void;
  onLogout?: () => void;
  breadcrumbs?: { label: string; href?: string }[];
}

export function Header({ user, onMenuClick, onLogout, breadcrumbs }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-card px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="hidden md:block">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {user?.department && (
          <div className="hidden items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium sm:flex">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            {user.department.name}
          </div>
        )}
        <form action="/search" className="hidden w-64 sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="search"
              placeholder="Search knowledge..."
              className="flex h-10 w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </form>

        <Button variant="ghost" size="icon" asChild className="relative">
          <Link href="/notifications">
            <Bell className="h-5 w-5" />
            {(user?.unreadNotifications ?? 0) > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {user!.unreadNotifications}
              </span>
            )}
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user ? getInitials(user.firstName, user.lastName) : "?"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {user && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
