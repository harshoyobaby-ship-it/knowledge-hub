"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserInsights } from "@/lib/insights";

export const emptyInsights: UserInsights = {
  totalModules: 0,
  completedModules: 0,
  pendingModules: 0,
  overallProgress: 0,
  chaptersCompleted: 0,
  sopsCompleted: 0,
  quizzesCompleted: 0,
  totalChapters: 0,
  totalSOPs: 0,
  totalQuizzes: 0,
  timeSpentMinutes: 0,
  quizScores: [],
  recentCompletions: [],
  weeklyProgress: Array.from({ length: 8 }, (_, i) => ({
    week: `W${i + 1}`,
    completed: 0,
  })),
  departmentProgress: [],
};

async function fetchInsights(): Promise<UserInsights> {
  const res = await fetch("/api/insights", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load insights");
  return json.data;
}

export function useInsights() {
  return useQuery({
    queryKey: ["insights"],
    queryFn: fetchInsights,
    placeholderData: emptyInsights,
    retry: false,
  });
}

export function formatTimeSpent(minutes: number): string {
  if (minutes === 0) return "0h";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
