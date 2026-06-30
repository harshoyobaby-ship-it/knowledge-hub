"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  unreadNotifications?: number;
}

async function fetchAuthUser(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to fetch user");
  const json = await res.json();
  const data = json.data;
  if (!data) return null;
  return {
    userId: data.id ?? data.userId,
    email: data.email,
    role: data.role,
    firstName: data.firstName,
    lastName: data.lastName,
    avatar: data.avatar,
    jobTitle: data.jobTitle,
    phone: data.phone,
    departmentId: data.department?.id ?? data.departmentId,
    department: data.department,
    unreadNotifications: data.unreadNotifications,
  };
}

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchAuthUser,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
      router.push("/");
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
