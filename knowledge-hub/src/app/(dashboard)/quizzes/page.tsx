"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

interface QuizListItem {
  id: string;
  title: string;
  description?: string | null;
  passingPercentage: number;
  maxAttempts: number;
  questionCount: number;
  department?: { name: string } | null;
  attemptCount?: number;
  lastScore?: number | null;
  bestScore?: number | null;
  attemptsRemaining?: number;
}

async function fetchQuizzes() {
  const res = await fetch("/api/quizzes?limit=50", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data.data as QuizListItem[];
}

export default function QuizzesPage() {
  const { data: quizzes, isLoading, error } = useQuery({
    queryKey: ["learner-quizzes"],
    queryFn: fetchQuizzes,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mock Tests"
        description="Take department quizzes and track your scores"
      />

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : error ? (
        <EmptyState title="Could not load quizzes" description={(error as Error).message} />
      ) : !quizzes?.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No quizzes available"
          description="Your administrator has not published any mock tests yet."
        />
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => {
            const score = quiz.bestScore ?? quiz.lastScore;
            const attempts = quiz.attemptCount ?? 0;
            const canAttempt = (quiz.attemptsRemaining ?? quiz.maxAttempts) > 0;

            return (
              <Link key={quiz.id} href={canAttempt ? `/quizzes/${quiz.id}` : "#"}>
                <Card className={cn("transition-shadow", canAttempt && "hover:shadow-md")}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{quiz.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {quiz.department?.name ?? "General"} · {quiz.questionCount} questions · Pass: {quiz.passingPercentage}%
                      </p>
                    </div>
                    {score != null && (
                      <div className="w-32 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Best score</span>
                          <span
                            className={
                              score >= quiz.passingPercentage
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }
                          >
                            {score}%
                          </span>
                        </div>
                        <Progress value={score} />
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {attempts}/{quiz.maxAttempts} attempts
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
