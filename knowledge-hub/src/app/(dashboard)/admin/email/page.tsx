"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { formatDate } from "@/lib/utils";

async function fetchEmailLogs() {
  const res = await fetch("/api/admin/email?limit=30", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function AdminEmailPage() {
  const queryClient = useQueryClient();
  const [force, setForce] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-email-logs"],
    queryFn: fetchEmailLogs,
  });

  const sendNow = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-email-logs"] });
      toast.success(`Sent ${result.sent} emails (${result.skipped} skipped, ${result.failed} failed)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Automation"
        description="Weekly training reminders for employees with incomplete modules"
        actions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
              />
              Force resend
            </label>
            <Button onClick={() => sendNow.mutate()} disabled={sendNow.isPending}>
              {sendNow.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send weekly reminders now
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Email configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Status:</span> {data?.config?.enabled ? "Enabled" : "Disabled"}</p>
          <p><span className="text-muted-foreground">Mode:</span> {data?.config?.mode === "smtp" ? "SMTP (live emails)" : "Console (logs to terminal — set SMTP_* in .env for real emails)"}</p>
          <p><span className="text-muted-foreground">From:</span> {data?.config?.from ?? "—"}</p>
          <p className="text-muted-foreground pt-2">
            Schedule weekly cron: <code className="text-xs">POST /api/cron/weekly-training-reminders</code> with header <code className="text-xs">Authorization: Bearer CRON_SECRET</code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent email log</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton rows={5} />
          ) : !data?.data?.length ? (
            <p className="text-sm text-muted-foreground">No emails sent yet. Click &quot;Send weekly reminders now&quot; to test.</p>
          ) : (
            <div className="divide-y text-sm">
              {data.data.map((log: {
                id: string;
                toEmail: string;
                subject: string;
                status: string;
                sentAt: string | null;
                createdAt: string;
                user: { firstName: string; lastName: string };
              }) => (
                <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">{log.user.firstName} {log.user.lastName}</p>
                    <p className="text-muted-foreground">{log.toEmail} · {log.subject}</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      log.status === "SENT" ? "bg-emerald-100 text-emerald-700" :
                      log.status === "FAILED" ? "bg-red-100 text-red-700" :
                      "bg-muted text-muted-foreground"
                    }`}>{log.status}</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(log.sentAt ?? log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
