"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

interface DepartmentDetail {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  _count: { members: number; chapters: number; sops: number; quizzes: number };
  head?: { id: string; firstName: string; lastName: string; email: string } | null;
  chapters: Array<{ id: string; title: string; difficulty: string; estimatedMinutes: number }>;
}

async function fetchDepartment(id: string): Promise<DepartmentDetail> {
  const res = await fetch(`/api/departments/${id}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Department not found");
  return json.data;
}

export default function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: dept, isLoading, error } = useQuery({
    queryKey: ["department", id],
    queryFn: () => fetchDepartment(id),
  });

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (error || !dept) {
    return (
      <EmptyState
        title="Department not found"
        description={(error as Error)?.message ?? "This department may have been removed."}
        action={
          <Button asChild variant="outline">
            <Link href="/departments">Back to departments</Link>
          </Button>
        }
      />
    );
  }

  const headName = dept.head
    ? `${dept.head.firstName} ${dept.head.lastName}`
    : "Not assigned";

  return (
    <div className="space-y-6">
      <PageHeader title={dept.name} description={dept.description ?? ""} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span>{dept.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Head</span>
              <span>{headName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Members</span>
              <span>{dept._count.members}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SOPs</span>
              <span>{dept._count.sops}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quizzes</span>
              <span>{dept._count.quizzes}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Learning Modules</CardTitle></CardHeader>
          <CardContent>
            {dept.chapters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No modules in this department yet.</p>
            ) : (
              <div className="space-y-2">
                {dept.chapters.map((ch) => (
                  <Link
                    key={ch.id}
                    href={`/learning-modules/${ch.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="font-medium">{ch.title}</span>
                    <span className="text-muted-foreground">
                      {ch.difficulty} · {ch.estimatedMinutes}min
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
