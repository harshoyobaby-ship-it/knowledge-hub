"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BookOpen, ClipboardList, FileText, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

const iconByType = {
  Chapter: BookOpen,
  SOP: FileText,
  Quiz: ClipboardList,
};

async function fetchSearch(query: string) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("q") || "";
  const [query, setQuery] = useState(initial);
  const [debounced, setDebounced] = useState(initial);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => fetchSearch(debounced),
    enabled: debounced.trim().length >= 2,
  });

  const results = data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Search"
        description="Find knowledge chapters, founder SOPs, and quizzes for your department"
      />

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search SOPs, chapters, quizzes..."
        className="max-w-lg"
      />

      {debounced.trim().length < 2 ? (
        <p className="text-sm text-muted-foreground">
          Type at least 2 characters to search your department&apos;s learning content.
        </p>
      ) : isLoading || isFetching ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{debounced}&rdquo;
          </p>
          <div className="space-y-2">
            {results.map((r: { type: keyof typeof iconByType; title: string; meta: string; href: string }, i: number) => {
              const Icon = iconByType[r.type] ?? Search;
              return (
                <Link key={`${r.type}-${r.href}-${i}`} href={r.href}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{r.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {r.type} · {r.meta}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
            {results.length === 0 && (
              <p className="py-12 text-center text-muted-foreground">No results found.</p>
            )}
          </div>
        </>
      )}
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
