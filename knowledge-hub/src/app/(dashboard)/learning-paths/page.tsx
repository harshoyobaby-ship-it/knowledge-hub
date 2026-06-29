"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Route } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";

async function fetchPaths() {
  const res = await fetch("/api/learning-paths?limit=50", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data.data;
}

export default function LearningPathsPage() {
  const queryClient = useQueryClient();

  const { data: paths, isLoading } = useQuery({
    queryKey: ["learning-paths"],
    queryFn: fetchPaths,
  });

  const enroll = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/learning-paths/${id}/enroll`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-paths"] });
      toast.success("Enrolled in learning path");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Learning Paths" description="Structured onboarding and skill journeys" />

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : !paths?.length ? (
        <EmptyState icon={Route} title="No paths available" description="Your administrator has not published learning paths yet." />
      ) : (
        <div className="space-y-3">
          {paths.map((p: {
            id: string;
            name: string;
            description?: string;
            durationDays: number;
            itemCount: number;
            department?: { name: string };
            enrollment?: { progress: number; completedAt: string | null } | null;
          }) => (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Route className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.department?.name ?? "Company-wide"} · {p.itemCount} steps · {p.durationDays} days
                  </p>
                  {p.enrollment && (
                    <div className="mt-2 w-full max-w-xs">
                      <Progress value={p.enrollment.progress} />
                    </div>
                  )}
                </div>
                {p.enrollment ? (
                  <Button variant="outline" asChild>
                    <Link href={`/learning-paths/${p.id}`}>Continue</Link>
                  </Button>
                ) : (
                  <Button onClick={() => enroll.mutate(p.id)} disabled={enroll.isPending}>
                    Enroll
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
