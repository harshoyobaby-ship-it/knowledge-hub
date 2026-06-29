"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, Route, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

async function fetchTeamStats() {
  const res = await fetch("/api/hr/stats", { credentials: "include" });
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
      <PageHeader title="Manager Panel" description="Track team learning, assign paths, and view reports" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Team Size" value={data?.employeeCount ?? 0} icon={Users} />
        <StatCard title="Active Learners" value={data?.activeLearners ?? 0} icon={TrendingUp} />
        <StatCard title="Overdue" value={data?.overdueLearning ?? 0} icon={BarChart3} />
        <StatCard title="Departments" value={data?.departmentDistribution?.length ?? 0} icon={Route} />
      </div>

      <Card>
        <CardHeader><CardTitle>Manager Actions</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Link href="/admin/learning-paths" className="rounded-lg border p-4 hover:bg-accent">
            <p className="font-medium">Assign Learning Paths</p>
            <p className="text-sm text-muted-foreground">Department onboarding journeys</p>
          </Link>
          <Link href="/hr" className="rounded-lg border p-4 hover:bg-accent">
            <p className="font-medium">Team Reports</p>
            <p className="text-sm text-muted-foreground">Progress and completion analytics</p>
          </Link>
          <Link href="/admin/quizzes" className="rounded-lg border p-4 hover:bg-accent">
            <p className="font-medium">Quiz Reports</p>
            <p className="text-sm text-muted-foreground">Review mock test scores</p>
          </Link>
          <Link href="/admin/content" className="rounded-lg border p-4 hover:bg-accent">
            <p className="font-medium">Approve Content</p>
            <p className="text-sm text-muted-foreground">Review department materials</p>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
