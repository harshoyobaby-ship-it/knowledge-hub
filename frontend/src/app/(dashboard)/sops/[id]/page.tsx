"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { formatDate } from "@/lib/utils";

async function fetchSOP(id: string) {
  const res = await fetch(`/api/sops/${id}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function SOPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: sop, isLoading, error } = useQuery({
    queryKey: ["sop", id],
    queryFn: () => fetchSOP(id),
  });

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (error || !sop) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/sops"><ArrowLeft className="mr-2 h-4 w-4" />Back to SOP Library</Link>
        </Button>
        <p className="text-muted-foreground">SOP not found or unavailable.</p>
      </div>
    );
  }

  const downloadUrl = sop.attachments?.[0]?.url ?? sop.fileUrl;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/sops"><ArrowLeft className="mr-2 h-4 w-4" />SOP Library</Link>
      </Button>

      <PageHeader
        title={sop.title}
        description={`${sop.department.name} · Version ${sop.version}`}
        actions={
          downloadUrl ? (
            <Button asChild>
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Owner</span>
              <span>{sop.owner.firstName} {sop.owner.lastName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <span>{sop.status}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Effective</span>
              <span>{formatDate(sop.effectiveDate)}</span>
            </div>
            {sop.reviewDate && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Review</span>
                <span>{formatDate(sop.reviewDate)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sop.attachments?.length ? (
              sop.attachments.map((file: {
                id: string;
                originalName: string;
                url: string;
                size: number;
              }) => (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>{file.originalName}</span>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </a>
              ))
            ) : sop.fileUrl ? (
              <a
                href={sop.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-accent"
              >
                <FileText className="h-4 w-4 text-primary" />
                {sop.fileName ?? "Download document"}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">No documents attached.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {sop.versions?.[0]?.changeNotes && (
        <Card>
          <CardHeader><CardTitle>Founder guidance</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {sop.versions[0].changeNotes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
