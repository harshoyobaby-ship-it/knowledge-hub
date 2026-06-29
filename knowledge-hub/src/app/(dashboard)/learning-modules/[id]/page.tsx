"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";

interface ChapterDetail {
  id: string;
  title: string;
  description: string | null;
  content: string;
  founderNotes: string | null;
  difficulty: string;
  estimatedMinutes: number;
  completed: boolean;
  department: { name: string };
  versions: { version: number; changeNotes: string | null; createdAt: string }[];
  attachments: { id: string; originalName: string; url: string; size: number; mimeType?: string }[];
}

async function fetchChapter(id: string): Promise<ChapterDetail> {
  const res = await fetch(`/api/chapters/${id}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Chapter not found");
  return json.data;
}

export default function ChapterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [completing, setCompleting] = useState(false);

  const { data: chapter, isLoading, error } = useQuery({
    queryKey: ["chapter", id],
    queryFn: () => fetchChapter(id),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "CHAPTER",
          chapterId: id,
          timeSpentMinutes: chapter?.estimatedMinutes ?? 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to mark complete");
      return json.data;
    },
    onSuccess: () => {
      toast.success("Module completed! Your insights have been updated.");
      queryClient.invalidateQueries({ queryKey: ["chapter", id] });
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setCompleting(false),
  });

  if (isLoading) return <LoadingSkeleton rows={2} />;
  if (error || !chapter) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Chapter not found.
      </div>
    );
  }

  const handleComplete = () => {
    if (chapter.completed) return;
    setCompleting(true);
    completeMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={chapter.title}
        description={`${chapter.department.name} · ${chapter.difficulty} · ${chapter.estimatedMinutes} min`}
        actions={
          chapter.completed ? (
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Completed</span>
            </div>
          ) : (
            <Button onClick={handleComplete} disabled={completing || completeMutation.isPending}>
              {(completing || completeMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Mark as Complete
            </Button>
          )
        }
      />

      {!chapter.completed && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Your progress on this module</span>
              <span className="font-medium">0%</span>
            </div>
            <Progress value={0} />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="versions">Version History</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>
        <TabsContent value="content">
          <Card>
            <CardHeader><CardTitle>Chapter Content</CardTitle></CardHeader>
            <CardContent
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: chapter.content }}
            />
            {chapter.founderNotes && (
              <CardContent className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-2">Founder Notes</h3>
                <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground text-sm">
                  {chapter.founderNotes}
                </blockquote>
              </CardContent>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="versions">
          <Card>
            <CardContent className="p-6">
              {chapter.versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No version history.</p>
              ) : (
                <div className="space-y-3 text-sm">
                  {chapter.versions.map((v) => (
                    <div key={v.version} className="flex justify-between rounded-lg border p-3">
                      <span>Version {v.version}{v.changeNotes ? ` — ${v.changeNotes}` : ""}</span>
                      <span className="text-muted-foreground">{formatDate(v.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="attachments">
          <Card>
            <CardContent className="p-6 text-sm">
              {chapter.attachments.length === 0 ? (
                <p className="text-muted-foreground">No attachments for this chapter.</p>
              ) : (
                <ul className="space-y-2">
                  {chapter.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {a.originalName}
                      </a>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({Math.round(a.size / 1024)} KB)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
