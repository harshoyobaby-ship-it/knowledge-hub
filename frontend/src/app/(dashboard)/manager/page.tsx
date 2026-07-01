"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, Route, FolderOpen, ArrowRight, Building2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

async function fetchTeamStats() {
  const res = await fetch("/api/manager/stats", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function ManagerPanelPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["manager-stats"],
    queryFn: fetchTeamStats,
  });

  if (isLoading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manager Panel"
        description={
          data?.department
            ? `Manage content and track learning for ${data.department.name}`
            : "Track team learning, assign paths, and manage department content"
        }
        actions={
          <Button asChild>
            <Link href="/manager/employees">
              View team progress
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {data?.department && (
        <div className="flex items-center gap-2 rounded-lg border bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          <Building2 className="h-4 w-4" />
          <span>
            Your department: <strong>{data.department.name}</strong> — content and progress are scoped to this department only.
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Team Size" value={data?.employeeCount ?? 0} icon={Users} />
        <StatCard title="Active Learners" value={data?.activeLearners ?? 0} icon={TrendingUp} />
        <StatCard title="Overdue" value={data?.overdueLearning ?? 0} icon={Route} />
        <StatCard title="Completion Rate" value={`${data?.completionRate ?? 0}%`} icon={FolderOpen} />
      </div>

      <Card>
        <CardHeader><CardTitle>Manager Actions</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Link href="/manager/employees" className="rounded-lg border p-4 hover:bg-accent">
            <p className="font-medium">Team Progress</p>
            <p className="text-sm text-muted-foreground">View employee training completion</p>
          </Link>
          <Link href="/manager/tasks" className="rounded-lg border p-4 hover:bg-accent">
            <p className="font-medium">Assign Team Tasks</p>
            <p className="text-sm text-muted-foreground">Give tasks to employees in your department</p>
          </Link>
          <Link href="/department-tasks" className="rounded-lg border p-4 hover:bg-accent">
            <p className="font-medium">Founder Tasks</p>
            <p className="text-sm text-muted-foreground">Follow up on founder-assigned department directives</p>
          </Link>
          <Link href="/admin/content" className="rounded-lg border p-4 hover:bg-accent">
            <p className="font-medium">Department Content</p>
            <p className="text-sm text-muted-foreground">Add modules, SOPs, and quizzes</p>
          </Link>
          <Link href="/admin/learning-paths" className="rounded-lg border p-4 hover:bg-accent">
            <p className="font-medium">Learning Paths</p>
            <p className="text-sm text-muted-foreground">Assign onboarding journeys</p>
          </Link>
          <Link href="/admin/courses" className="rounded-lg border p-4 hover:bg-accent">
            <p className="font-medium">Courses</p>
            <p className="text-sm text-muted-foreground">Manage department courses</p>
          </Link>
        </CardContent>
      </Card>

      {data?.topPerformers?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Top Performers</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {data.topPerformers.map((p: { name: string; progress: number }, i: number) => (
              <div key={p.name} className="flex items-center justify-between py-3 text-sm">
                <span>{i + 1}. {p.name}</span>
                <span className="text-muted-foreground">{p.progress} completions</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
