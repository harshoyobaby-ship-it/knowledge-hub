"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[] | null;
  points: number;
}

interface QuizDetail {
  id: string;
  title: string;
  description?: string | null;
  passingPercentage: number;
  maxAttempts: number;
  attemptCount: number;
  attemptsRemaining: number;
  questions: Question[];
}

interface SubmitResult {
  score: number | null;
  passed: boolean | null;
  needsReview: boolean;
  passingPercentage: number;
  attemptsRemaining: number;
}

async function fetchQuiz(id: string): Promise<QuizDetail> {
  const res = await fetch(`/api/quizzes/${id}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function QuizDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [startedAt] = useState(() => Date.now());

  const { data: quiz, isLoading, error } = useQuery({
    queryKey: ["quiz", id],
    queryFn: () => fetchQuiz(id),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const timeSpentSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const res = await fetch(`/api/quizzes/${id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, timeSpentSeconds }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data as SubmitResult;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.needsReview) {
        toast.info("Submitted for review");
      } else if (data.passed) {
        toast.success(`Passed with ${data.score}%`);
      } else {
        toast.error(`Score: ${data.score}% — did not pass`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function setSingleAnswer(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function toggleMultiAnswer(questionId: string, option: string) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [questionId]: next };
    });
  }

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (error || !quiz) {
    return (
      <EmptyState
        title="Quiz unavailable"
        description={error instanceof Error ? error.message : "Could not load quiz"}
      />
    );
  }

  if (quiz.questions.length === 0) {
    return (
      <EmptyState
        title="No questions yet"
        description="This quiz has not been configured. Contact your administrator."
      />
    );
  }

  const canSubmit = quiz.attemptsRemaining > 0 && !result;

  return (
    <div className="space-y-6">
      <PageHeader
        title={quiz.title}
        description={`${quiz.questions.length} questions · Passing score: ${quiz.passingPercentage}% · Attempts left: ${quiz.attemptsRemaining}/${quiz.maxAttempts}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/quizzes">
              <ArrowLeft className="h-4 w-4" />
              All quizzes
            </Link>
          </Button>
        }
      />

      {result ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            {result.needsReview ? (
              <>
                <p className="text-lg font-medium">Submitted for manual review</p>
                <p className="text-sm text-muted-foreground">
                  Your answers include short-answer questions that need admin review.
                </p>
              </>
            ) : (
              <>
                <p
                  className={cn(
                    "text-4xl font-bold",
                    result.passed ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {result.score}%
                </p>
                <p className="text-lg font-medium">
                  {result.passed
                    ? "Great job! You passed this mock test."
                    : `You need ${result.passingPercentage}% to pass.`}
                </p>
              </>
            )}
            {result.attemptsRemaining > 0 && !result.passed && (
              <Button onClick={() => { setResult(null); setAnswers({}); }}>
                Try again
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/quizzes">Back to quizzes</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quiz.questions.map((q, idx) => (
            <Card key={q.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  Question {idx + 1}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({q.points} pt{q.points !== 1 ? "s" : ""})
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{q.text}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {q.type === "TRUE_FALSE" && (
                  (["True", "False"] as const).map((label, i) => (
                    <label
                      key={label}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                    >
                      <input
                        type="radio"
                        name={q.id}
                        className="accent-primary"
                        checked={answers[q.id] === (i === 0)}
                        onChange={() => setSingleAnswer(q.id, i === 0)}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))
                )}

                 {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") &&
                  (q.options ?? []).map((opt) => (
                    <label
                      key={opt}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                    >
                      <input
                        type={q.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                        name={q.id}
                        className="accent-primary"
                        checked={
                          q.type === "MULTIPLE_CHOICE"
                            ? Array.isArray(answers[q.id]) &&
                              (answers[q.id] as string[]).includes(opt)
                            : answers[q.id] === opt
                        }
                        onChange={() =>
                          q.type === "MULTIPLE_CHOICE"
                            ? toggleMultiAnswer(q.id, opt)
                            : setSingleAnswer(q.id, opt)
                        }
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}

                {q.type === "SHORT_ANSWER" && (
                  <Input
                    placeholder="Your answer"
                    value={String(answers[q.id] ?? "")}
                    onChange={(e) => setSingleAnswer(q.id, e.target.value)}
                  />
                )}
              </CardContent>
            </Card>
          ))}

          {canSubmit ? (
            <Button
              className="w-full"
              size="lg"
              disabled={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Mock Test
            </Button>
          ) : (
            <Card>
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                You have used all attempts for this quiz.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
