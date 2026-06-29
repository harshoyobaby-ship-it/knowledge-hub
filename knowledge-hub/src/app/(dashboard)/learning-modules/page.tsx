"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus, Clock, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const difficultyColors: Record<string, string> = {
  BEGINNER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  INTERMEDIATE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ADVANCED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  EXPERT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

interface Chapter {
  id: string;
  title: string;
  category: string | null;
  difficulty: string;
  estimatedMinutes: number;
  status: string;
  completed: boolean;
  department: { id: string; name: string };
}

async function fetchChapters(search: string): Promise<Chapter[]> {
  const params = new URLSearchParams({ limit: "50", status: "PUBLISHED" });
  if (search) params.set("search", search);
  const res = await fetch(`/api/chapters?${params}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data.data;
}

export default function LearningModulesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data: chapters, isLoading } = useQuery({
    queryKey: ["chapters", debouncedSearch],
    queryFn: () => fetchChapters(debouncedSearch),
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout((handleSearch as { timer?: ReturnType<typeof setTimeout> }).timer);
    (handleSearch as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(
      () => setDebouncedSearch(value),
      300
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Modules"
        description="Knowledge chapters — complete modules to grow your learning insights"
        actions={
          <Button asChild><Link href="/learning-modules/new"><Plus className="h-4 w-4" /> New Chapter</Link></Button>
        }
      />

      <div className="flex gap-3">
        <Input
          placeholder="Search chapters..."
          className="max-w-sm"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : !chapters?.length ? (
        <EmptyState
          icon={BookOpen}
          title="No modules available"
          description="Published learning modules will appear here."
        />
      ) : (
        <div className="space-y-3">
          {chapters.map((ch) => (
            <Link key={ch.id} href={`/learning-modules/${ch.id}`}>
              <Card className={cn("transition-shadow hover:shadow-md", ch.completed && "border-emerald-200 dark:border-emerald-900/50")}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    ch.completed ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-primary/10"
                  )}>
                    {ch.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{ch.title}</p>
                    <p className="text-sm text-muted-foreground">{ch.department.name} · {ch.category ?? "General"}</p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", difficultyColors[ch.difficulty])}>
                    {ch.difficulty}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />{ch.estimatedMinutes}m
                  </span>
                  {ch.completed ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Completed
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      Not started
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
