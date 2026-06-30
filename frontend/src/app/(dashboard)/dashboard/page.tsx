"use client";

import {
  BookOpen,
  CheckCircle2,
  Clock,
  Target,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { useInsights, emptyInsights, formatTimeSpent } from "@/hooks/use-insights";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: insights, isLoading: insightsLoading } = useInsights();

  if (authLoading || insightsLoading) {
    return <LoadingSkeleton />;
  }

  const data = insights ?? emptyInsights;
  const isNewUser = data.completedModules === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? "there"}!`}
        description={`${user?.department?.name ?? "Your"} department · ${user?.jobTitle ?? "Team member"}`}
      />

      {isNewUser && data.totalModules > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Your learning journey starts here</p>
              <p className="text-sm text-muted-foreground">
                Complete modules to grow your insights — you have {data.totalModules} available to start.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/learning-modules">Start Learning</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Modules" value={data.totalModules} icon={BookOpen} />
        <StatCard title="Completed" value={data.completedModules} icon={CheckCircle2} />
        <StatCard title="Pending" value={data.pendingModules} icon={Clock} />
        <StatCard title="Overall Progress" value={`${data.overallProgress}%`} icon={Target} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Learning Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {data.weeklyProgress.every((w) => w.completed === 0) ? (
              <EmptyState
                icon={BookOpen}
                title="No completions yet"
                description="Complete a module to see your weekly progress chart."
              />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.weeklyProgress}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quiz Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.quizScores.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No quiz scores yet"
                description="Pass a quiz to see your scores here."
              />
            ) : (
              data.quizScores.map((quiz) => (
                <div key={quiz.quizId} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{quiz.quizTitle}</span>
                    <span className={quiz.passed ? "text-emerald-600" : "text-amber-600"}>
                      {quiz.score}% {quiz.passed ? "✓" : "—"}
                    </span>
                  </div>
                  <Progress value={quiz.score} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Recent Completions</CardTitle></CardHeader>
          <CardContent>
            {data.recentCompletions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing completed yet. Start your first module!</p>
            ) : (
              <div className="space-y-3">
                {data.recentCompletions.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-2 text-sm">
                    <span className="font-medium">{item.title}</span>
                    <span className="shrink-0 text-muted-foreground">{formatDate(item.completedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Learning Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between rounded-lg border p-3">
              <span>Chapters</span>
              <span className="font-medium">{data.chaptersCompleted}/{data.totalChapters}</span>
            </div>
            <div className="flex justify-between rounded-lg border p-3">
              <span>SOPs</span>
              <span className="font-medium">{data.sopsCompleted}/{data.totalSOPs}</span>
            </div>
            <div className="flex justify-between rounded-lg border p-3">
              <span>Quizzes</span>
              <span className="font-medium">{data.quizzesCompleted}/{data.totalQuizzes}</span>
            </div>
            <div className="flex justify-between rounded-lg border p-3">
              <span>Time Spent</span>
              <span className="font-medium">{formatTimeSpent(data.timeSpentMinutes)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Department Progress</CardTitle></CardHeader>
          <CardContent>
            {data.departmentProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground">Complete modules to track department progress.</p>
            ) : (
              <div className="space-y-3">
                {data.departmentProgress.slice(0, 4).map((dept) => (
                  <div key={dept.departmentId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{dept.name}</span>
                      <span className="font-medium">{dept.progress}%</span>
                    </div>
                    <Progress value={dept.progress} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {data.weeklyProgress.some((w) => w.completed > 0) && (
        <Card>
          <CardHeader><CardTitle>Progress Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.weeklyProgress}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="completed" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
