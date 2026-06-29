"use client";

import { use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoDepartments, demoChapters } from "@/lib/demo-data";

export default function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const dept = demoDepartments.find((d) => d.id === id) ?? demoDepartments[0];
  const chapters = demoChapters.filter((c) => c.department === dept.name);

  return (
    <div className="space-y-6">
      <PageHeader
        title={dept.name}
        description={dept.description ?? ""}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{dept.status}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Head</span><span>{dept.head}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Members</span><span>{dept.members}</span></div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Knowledge Chapters</CardTitle></CardHeader>
          <CardContent>
            {chapters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No chapters yet.</p>
            ) : (
              <div className="space-y-2">
                {chapters.map((ch) => (
                  <div key={ch.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span className="font-medium">{ch.title}</span>
                    <span className="text-muted-foreground">{ch.difficulty} · {ch.estimatedMinutes}min</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
