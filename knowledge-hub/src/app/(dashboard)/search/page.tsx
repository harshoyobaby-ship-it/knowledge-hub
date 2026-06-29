"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BookOpen, Building2, ClipboardList, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { demoChapters, demoSOPs, demoQuizzes, demoDepartments } from "@/lib/demo-data";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") || "").toLowerCase();

  const results = query
    ? [
        ...demoChapters.filter((c) => c.title.toLowerCase().includes(query)).map((c) => ({ type: "Chapter", title: c.title, meta: c.department, icon: BookOpen, href: `/learning-modules/${c.id}` })),
        ...demoSOPs.filter((s) => s.title.toLowerCase().includes(query)).map((s) => ({ type: "SOP", title: s.title, meta: s.department, icon: FileText, href: `/sops/${s.id}` })),
        ...demoQuizzes.filter((q) => q.title.toLowerCase().includes(query)).map((q) => ({ type: "Quiz", title: q.title, meta: q.department, icon: ClipboardList, href: `/quizzes/${q.id}` })),
        ...demoDepartments.filter((d) => d.name.toLowerCase().includes(query)).map((d) => ({ type: "Department", title: d.name, meta: `${d.members} members`, icon: Building2, href: `/departments/${d.id}` })),
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Search" description="Find knowledge chapters, SOPs, quizzes, and departments" />

      <form action="/search">
        <Input name="q" defaultValue={query} placeholder="Search everything..." className="max-w-lg" />
      </form>

      {query && (
        <p className="text-sm text-muted-foreground">{results.length} results for &ldquo;{query}&rdquo;</p>
      )}

      <div className="space-y-2">
        {results.map((r, i) => (
          <a key={i} href={r.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <r.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{r.type} · {r.meta}</p>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
        {query && results.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">No results found.</p>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}
