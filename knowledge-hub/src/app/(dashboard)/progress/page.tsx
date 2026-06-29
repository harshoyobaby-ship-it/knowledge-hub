"use client";

import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useInsights, formatTimeSpent } from "@/hooks/use-insights";
import { BookOpen } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function ProgressPage() {
  const { data: insights, isLoading } = useInsights();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const data = insights!;
  const deptProgress = data.departmentProgress;

  return (
    <div className="space-y-6">
      <PageHeader title="My Progress" description="Track your learning journey — insights grow as you complete modules" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Overall Completion</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.overallProgress}%</p>
            <Progress value={data.overallProgress} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Modules Completed</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.completedModules}/{data.totalModules}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Time Spent</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatTimeSpent(data.timeSpentMinutes)}</p>
            <p className="text-sm text-muted-foreground">Total learning time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Department Completion</CardTitle></CardHeader>
        <CardContent>
          {deptProgress.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No progress yet"
              description="Complete learning modules to see your department breakdown."
            />
          ) : (
            <>
              <div className="mb-6 space-y-4">
                {deptProgress.map((d) => (
                  <div key={d.departmentId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{d.name}</span>
                      <span className="font-medium">{d.completed}/{d.total} · {d.progress}%</span>
                    </div>
                    <Progress value={d.progress} />
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={deptProgress} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="progress" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
