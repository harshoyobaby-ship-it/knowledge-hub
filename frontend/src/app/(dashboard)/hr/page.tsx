"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

async function fetchHRStats() {
  const res = await fetch("/api/hr/stats", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function HRDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["hr-stats"],
    queryFn: fetchHRStats,
  });

  if (isLoading) return <LoadingSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Dashboard"
        description="Employee onboarding, progress, and reports"
        actions={
          <Button asChild>
            <Link href="/hr/employees">
              View all employee progress
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Employees" value={data?.employeeCount ?? 0} icon={Users} />
        <StatCard title="Active Learners" value={data?.activeLearners ?? 0} icon={TrendingUp} />
        <StatCard title="Overdue Learning" value={data?.overdueLearning ?? 0} icon={AlertTriangle} />
        <StatCard title="Departments" value={data?.departmentDistribution?.length ?? 0} icon={Users} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Department Headcount</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.departmentDistribution ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Completion by Department</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(data?.completionRates ?? []).map((row: { department: string; rate: number }) => (
              <div key={row.department} className="flex items-center justify-between text-sm">
                <span>{row.department}</span>
                <span className="font-medium">{row.rate}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top Performers</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {(data?.topPerformers ?? []).map((p: { name: string; progress: number }, i: number) => (
            <div key={p.name} className="flex items-center justify-between py-3 text-sm">
              <span>{i + 1}. {p.name}</span>
              <span className="text-muted-foreground">{p.progress} completions</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
