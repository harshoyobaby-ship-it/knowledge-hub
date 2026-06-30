"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";

interface AttemptRow {
  id: string;
  score: number | null;
  passed: boolean | null;
  needsReview: boolean;
  startedAt: string;
  completedAt: string | null;
  timeSpentSeconds: number | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department: { name: string } | null;
  };
}

async function fetchScores(quizId: string) {
  const res = await fetch(`/api/quizzes/${quizId}/attempts?limit=100`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data as {
    quiz: {
      id: string;
      title: string;
      passingPercentage: number;
      questionCount: number;
      department: { name: string } | null;
    };
    summary: { totalAttempts: number; passedCount: number; passRate: number };
    data: AttemptRow[];
  };
}

export default function QuizScoresPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ["quiz-scores", id],
    queryFn: () => fetchScores(id),
  });

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (error || !data) {
    return (
      <EmptyState
        title="Could not load scores"
        description={error instanceof Error ? error.message : "Unknown error"}
      />
    );
  }

  const { quiz, summary, data: attempts } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Scores: ${quiz.title}`}
        description={`${quiz.department?.name ?? "All departments"} · Pass mark ${quiz.passingPercentage}% · ${quiz.questionCount} questions`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/content">
              <ArrowLeft className="h-4 w-4" />
              Back to content
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total attempts" value={summary.totalAttempts} icon={Clock} />
        <StatCard title="Passed" value={summary.passedCount} icon={CheckCircle2} />
        <StatCard title="Pass rate" value={`${summary.passRate}%`} icon={XCircle} />
      </div>

      {attempts.length === 0 ? (
        <EmptyState
          title="No attempts yet"
          description="Candidate scores will appear here once learners submit the mock test."
        />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {attempts.map((attempt) => (
              <div key={attempt.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {attempt.user.firstName} {attempt.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {attempt.user.email}
                    {attempt.user.department ? ` · ${attempt.user.department.name}` : ""}
                  </p>
                </div>
                <div className="text-right text-sm">
                  {attempt.needsReview ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      Needs review
                    </span>
                  ) : (
                    <p
                      className={cn(
                        "text-lg font-bold",
                        attempt.passed ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {attempt.score != null ? `${attempt.score}%` : "—"}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {attempt.completedAt ? formatDate(attempt.completedAt) : "In progress"}
                    {attempt.timeSpentSeconds
                      ? ` · ${Math.ceil(attempt.timeSpentSeconds / 60)} min`
                      : ""}
                  </p>
                </div>
                {!attempt.needsReview && attempt.passed != null && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      attempt.passed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    {attempt.passed ? "Passed" : "Failed"}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
