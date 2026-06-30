"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";

interface SOPItem {
  id: string;
  title: string;
  version: number;
  status: string;
  effectiveDate: string;
  reviewDate?: string | null;
  department: { name: string };
  attachments?: { id: string; originalName: string; url: string }[];
}

async function fetchSOPs(search: string) {
  const params = new URLSearchParams({ limit: "50" });
  if (search) params.set("search", search);
  const res = await fetch(`/api/sops?${params}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data.data as SOPItem[];
}

export default function SOPsPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  const { data: sops, isLoading } = useQuery({
    queryKey: ["learner-sops", debounced],
    queryFn: () => fetchSOPs(debounced),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="SOP Library" description="Standard operating procedures with version control" />

      <Input
        placeholder="Search SOPs..."
        className="max-w-sm"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setTimeout(() => setDebounced(e.target.value), 300);
        }}
      />

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : !sops?.length ? (
        <EmptyState icon={FileText} title="No SOPs" description="No published SOPs for your department." />
      ) : (
        <div className="space-y-3">
          {sops.map((sop) => (
            <Link key={sop.id} href={`/sops/${sop.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{sop.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {sop.department.name} · v{sop.version}
                    </p>
                  </div>
                  <div className="hidden text-right text-sm text-muted-foreground sm:block">
                    <p>Effective: {formatDate(sop.effectiveDate)}</p>
                    {sop.reviewDate && <p>Review: {formatDate(sop.reviewDate)}</p>}
                  </div>
                  {sop.attachments?.[0] && (
                    <a
                      href={sop.attachments[0].url}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-md border p-2 hover:bg-accent"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
