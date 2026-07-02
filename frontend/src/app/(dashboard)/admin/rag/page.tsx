"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Database,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type IndexedDocument = {
  document_id: string;
  title: string;
  department_id: string;
  source_type: string;
  filename: string;
  chunk_count: number;
};

type RagHealth = {
  status?: string;
  services?: Record<string, string>;
};

async function fetchDepartments() {
  const res = await fetch("/api/departments", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data as Array<{ id: string; name: string }>;
}

async function fetchRagPanelData() {
  const [healthRes, docsRes] = await Promise.all([
    fetch("/api/admin/rag/documents?scope=health", { credentials: "include" }),
    fetch("/api/admin/rag/documents", { credentials: "include" }),
  ]);
  const healthJson = await healthRes.json();
  const docsJson = await docsRes.json();
  if (!healthRes.ok) throw new Error(healthJson.error);
  if (!docsRes.ok) throw new Error(docsJson.error);
  return {
    health: healthJson.data as RagHealth,
    documents: docsJson.data as { items: IndexedDocument[]; total: number },
  };
}

function statusLabel(value?: string) {
  if (value === "healthy") return "Connected";
  if (value === "unhealthy") return "Not connected";
  return value ?? "—";
}

export default function AdminRagPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [companyWide, setCompanyWide] = useState(true);
  const [departmentId, setDepartmentId] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-rag-panel"],
    queryFn: fetchRagPanelData,
    refetchInterval: 15000,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      for (const file of selectedFiles) {
        form.append("files", file);
      }
      form.append("companyWide", companyWide ? "true" : "false");
      if (!companyWide && departmentId) {
        form.append("departmentId", departmentId);
      }
      const res = await fetch("/api/admin/rag/documents", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      return json.data as {
        results: Array<{ title: string; chunks: number }>;
        failed: Array<{ filename: string; error: string }>;
        total_chunks: number;
      };
    },
    onSuccess: (result) => {
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["admin-rag-panel"] });
      const failed = result.failed?.length ?? 0;
      toast.success(
        `Indexed ${result.results.length} file(s) · ${result.total_chunks} chunks` +
          (failed ? ` · ${failed} failed` : "")
      );
      if (failed) {
        toast.error(result.failed.map((f) => `${f.filename}: ${f.error}`).join("\n"));
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/rag/sync", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sync failed");
      return json.data as {
        upserted_chunks: number;
        items_processed: number;
        totals: { chapters: number; sops: number; courses: number };
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-rag-panel"] });
      toast.success(
        `Indexed ${result.items_processed} LMS items (${result.upserted_chunks} chunks) · ` +
          `${result.totals.chapters} chapters, ${result.totals.sops} SOPs, ${result.totals.courses} courses`
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reindexMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await fetch(`/api/admin/rag/documents/${encodeURIComponent(documentId)}`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Re-index failed");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rag-panel"] });
      toast.success("Document re-indexed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await fetch(`/api/admin/rag/documents/${encodeURIComponent(documentId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rag-panel"] });
      toast.success("Removed from knowledge index");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onFilesPicked = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    setSelectedFiles(Array.from(files));
  }, []);

  const services = data?.health?.services ?? {};
  const vectorBackend = services.pinecone === "healthy" ? "Pinecone" : "Local store";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Index"
        description="Upload bulk documents and index company knowledge for AI Chat"
        actions={
          <Button variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Bot className="h-4 w-4" />
              LLM (Groq)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-semibold">{statusLabel(services.groq)}</p>
            <p className="text-muted-foreground">Answers in AI Chat</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4" />
              Vector DB ({vectorBackend})
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-semibold">
              {statusLabel(services.pinecone ?? services.local_vectors)}
            </p>
            {services.pinecone === "unhealthy" && services.local_vectors === "healthy" ? (
              <p className="text-muted-foreground">Pinecone key invalid · using local fallback</p>
            ) : (
              <p className="text-muted-foreground">Document search index</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Layers className="h-4 w-4" />
              Indexed documents
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-semibold">{data?.documents?.total ?? 0}</p>
            <p className="text-muted-foreground">Ready for AI retrieval</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" />
              Bulk upload & index
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="rounded-lg border border-dashed p-6 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFilesPicked(e.dataTransfer.files);
              }}
            >
              <p className="mb-2 text-sm text-muted-foreground">
                Drop PDF, DOCX, PPTX, TXT, or MD files here
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.txt,.md,.markdown"
                className="hidden"
                onChange={(e) => onFilesPicked(e.target.files)}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                Choose files
              </Button>
            </div>

            {selectedFiles.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {selectedFiles.map((file) => (
                  <li key={file.name} className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{file.name}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={companyWide}
                onChange={(e) => setCompanyWide(e.target.checked)}
              />
              Company-wide (all departments can search)
            </label>

            {!companyWide ? (
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department scope" />
                </SelectTrigger>
                <SelectContent>
                  {(departments ?? []).map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <Button
              className="w-full"
              disabled={!selectedFiles.length || uploadMutation.isPending}
              onClick={() => uploadMutation.mutate()}
            >
              {uploadMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload & index {selectedFiles.length ? `(${selectedFiles.length})` : ""}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4" />
              Index LMS content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Re-index all published chapters, SOPs, and courses from the Knowledge Hub into the
              vector database. Run this after publishing or updating content.
            </p>
            <Button
              className="w-full"
              variant="secondary"
              disabled={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
            >
              {syncMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Sync & index LMS knowledge
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indexed knowledge</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton rows={5} />
          ) : !data?.documents?.items?.length ? (
            <p className="text-sm text-muted-foreground">
              No documents indexed yet. Upload files or sync LMS content above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Title</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Chunks</th>
                    <th className="py-2 pr-4 font-medium">Scope</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.documents.items.map((doc) => (
                    <tr key={doc.document_id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{doc.title}</p>
                        {doc.filename ? (
                          <p className="text-xs text-muted-foreground">{doc.filename}</p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 capitalize">{doc.source_type.toLowerCase()}</td>
                      <td className="py-3 pr-4">{doc.chunk_count}</td>
                      <td className="py-3 pr-4">
                        {doc.department_id ? "Department" : "Company-wide"}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {doc.source_type === "UPLOAD" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={reindexMutation.isPending}
                              onClick={() => reindexMutation.mutate(doc.document_id)}
                            >
                              Re-index
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (confirm(`Remove "${doc.title}" from the knowledge index?`)) {
                                deleteMutation.mutate(doc.document_id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
