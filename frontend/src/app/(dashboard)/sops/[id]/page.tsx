"use client";

import { use } from "react";
import { Download, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { demoSOPs } from "@/lib/demo-data";
import { formatDate } from "@/lib/utils";

export default function SOPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sop = demoSOPs.find((s) => s.id === id) ?? demoSOPs[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={sop.title}
        description={`${sop.department} · Version ${sop.version}`}
        actions={<Button><Download className="h-4 w-4" /> Download</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span>{sop.owner}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{sop.status}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Effective</span><span>{formatDate(sop.effectiveDate)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Review Date</span><span>{formatDate(sop.reviewDate)}</span></div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Version History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: sop.version }, (_, i) => sop.version - i).map((v) => (
              <div key={v} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Version {v}</span>
                  {v === sop.version && <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">Current</span>}
                </div>
                <Button variant="ghost" size="sm"><Download className="h-3 w-3" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
