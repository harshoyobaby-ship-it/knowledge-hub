"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, FileText, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { formatDate } from "@/lib/utils";

async function fetchEmployeeDetail(id: string) {
  const res = await fetch(`/api/manager/employees/${id}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Employee not found");
  return json.data;
}

export default function ManagerEmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ["manager-employee", id],
    queryFn: () => fetchEmployeeDetail(id),
  });

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (error || !data) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{(error as Error)?.message ?? "Not found"}</p>
        <Button variant="outline" asChild>
          <Link href="/manager/employees">Back to team</Link>
        </Button>
      </div>
    );
  }

  const { employee, insights } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/manager/employees">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        description={`${employee.jobTitle ?? employee.role} · ${employee.department?.name ?? "No department"}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Training progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Progress value={insights.overallProgress} className="h-3 flex-1" />
            <span className="text-2xl font-bold">{insights.overallProgress}%</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {insights.completedModules} of {insights.totalModules} modules completed
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <BookOpen className="h-6 w-6 text-primary" />
            <div>
              <p className="text-xl font-bold">
                {insights.chaptersCompleted}/{insights.totalChapters}
              </p>
              <p className="text-xs text-muted-foreground">Learning modules</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <p className="text-xl font-bold">
                {insights.sopsCompleted}/{insights.totalSOPs}
              </p>
              <p className="text-xs text-muted-foreground">SOPs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <ClipboardList className="h-6 w-6 text-primary" />
            <div>
              <p className="text-xl font-bold">
                {insights.quizzesCompleted}/{insights.totalQuizzes}
              </p>
              <p className="text-xs text-muted-foreground">Mock tests</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent completions</CardTitle></CardHeader>
        <CardContent>
          {insights.recentCompletions?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completions yet.</p>
          ) : (
            <div className="divide-y">
              {insights.recentCompletions.map((item: { id: string; title: string; type: string; completedAt: string }) => (
                <div key={item.id} className="flex justify-between py-3 text-sm">
                  <span>{item.title}</span>
                  <span className="text-muted-foreground">
                    {item.type} · {formatDate(item.completedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
