"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Archive,
  BookOpen,
  FileText,
  ClipboardList,
  Search,
  Layers,
  ListChecks,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ChapterFormDialog, type ChapterRecord } from "@/components/admin/chapter-form-dialog";
import { SOPFormDialog, type SOPRecord } from "@/components/admin/sop-form-dialog";
import { QuizFormDialog, type QuizRecord } from "@/components/admin/quiz-form-dialog";
import { QuizQuestionsDialog } from "@/components/admin/quiz-questions-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { cn, formatDate } from "@/lib/utils";
import { STATUS_LABELS } from "@/types";

interface Department {
  id: string;
  name: string;
}

interface ContentStats {
  chapters: { total: number; draft: number; published: number; archived: number };
  sops: { total: number; draft: number; published: number; archived: number };
  quizzes: { total: number; draft: number; published: number; archived: number };
}

const statusStyles: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PUBLISHED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  ARCHIVED: "bg-muted text-muted-foreground",
};

async function fetchDepartments(): Promise<Department[]> {
  const res = await fetch("/api/departments", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

async function fetchStats(): Promise<ContentStats> {
  const res = await fetch("/api/content/stats", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

async function fetchChapters(params: URLSearchParams) {
  params.set("manage", "true");
  const res = await fetch(`/api/chapters?${params}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

async function fetchSOPs(params: URLSearchParams) {
  params.set("manage", "true");
  const res = await fetch(`/api/sops?${params}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

async function fetchQuizzes(params: URLSearchParams) {
  params.set("manage", "true");
  const res = await fetch(`/api/quizzes?${params}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

async function fetchChapterDetail(id: string): Promise<ChapterRecord> {
  const res = await fetch(`/api/chapters/${id}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

async function fetchSOPDetail(id: string): Promise<SOPRecord> {
  const res = await fetch(`/api/sops/${id}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function ContentManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("chapters");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [chapterDialog, setChapterDialog] = useState(false);
  const [sopDialog, setSOPDialog] = useState(false);
  const [quizDialog, setQuizDialog] = useState(false);
  const [editingChapter, setEditingChapter] = useState<ChapterRecord | null>(null);
  const [editingSOP, setEditingSOP] = useState<SOPRecord | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<QuizRecord | null>(null);
  const [questionsQuiz, setQuestionsQuiz] = useState<QuizRecord | null>(null);
  const [questionsDialog, setQuestionsDialog] = useState(false);

  const isFounder =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;

  const lockedDept =
    user?.role === UserRole.DEPARTMENT_HEAD ? user.departmentId : null;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const listParams = new URLSearchParams({ limit: "50" });
  if (debouncedSearch) listParams.set("search", debouncedSearch);
  if (statusFilter !== "all") listParams.set("status", statusFilter);

  const { data: stats } = useQuery({
    queryKey: ["content-stats"],
    queryFn: fetchStats,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: fetchDepartments,
  });

  const { data: chaptersData, isLoading: chaptersLoading } = useQuery({
    queryKey: ["manage-chapters", listParams.toString()],
    queryFn: () => fetchChapters(new URLSearchParams(listParams)),
    enabled: tab === "chapters",
  });

  const { data: sopsData, isLoading: sopsLoading } = useQuery({
    queryKey: ["manage-sops", listParams.toString()],
    queryFn: () => fetchSOPs(new URLSearchParams(listParams)),
    enabled: tab === "sops",
  });

  const { data: quizzesData, isLoading: quizzesLoading } = useQuery({
    queryKey: ["manage-quizzes", listParams.toString()],
    queryFn: () => fetchQuizzes(new URLSearchParams(listParams)),
    enabled: tab === "quizzes",
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["content-stats"] });
    queryClient.invalidateQueries({ queryKey: ["manage-chapters"] });
    queryClient.invalidateQueries({ queryKey: ["manage-sops"] });
    queryClient.invalidateQueries({ queryKey: ["manage-quizzes"] });
    queryClient.invalidateQueries({ queryKey: ["chapters"] });
  }, [queryClient]);

  const createChapter = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (data) => {
      invalidateAll();
      if (data?.bulk) {
        toast.success(`Published to ${data.count} departments`);
      } else {
        toast.success("Chapter created");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateChapter = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/chapters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => { invalidateAll(); toast.success("Chapter updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveChapter = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/chapters/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
    },
    onSuccess: () => { invalidateAll(); toast.success("Chapter archived"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createSOP = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/sops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => { invalidateAll(); toast.success("SOP created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateSOP = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/sops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => { invalidateAll(); toast.success("SOP updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveSOP = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sops/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
    },
    onSuccess: () => { invalidateAll(); toast.success("SOP archived"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createQuiz = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => { invalidateAll(); toast.success("Quiz created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateQuiz = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/quizzes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => { invalidateAll(); toast.success("Quiz updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveQuiz = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/quizzes/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
    },
    onSuccess: () => { invalidateAll(); toast.success("Quiz archived"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleEditSOP = async (sop: SOPRecord) => {
    try {
      const detail = await fetchSOPDetail(sop.id);
      setEditingSOP(detail);
      setSOPDialog(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load SOP");
    }
  };

  const handleEditChapter = async (ch: ChapterRecord) => {
    try {
      const detail = await fetchChapterDetail(ch.id);
      setEditingChapter(detail);
      setChapterDialog(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load chapter");
    }
  };

  const openCreate = () => {
    if (tab === "chapters") { setEditingChapter(null); setChapterDialog(true); }
    else if (tab === "sops") { setEditingSOP(null); setSOPDialog(true); }
    else { setEditingQuiz(null); setQuizDialog(true); }
  };

  const createLabel =
    tab === "chapters"
      ? isFounder
        ? "Publish Knowledge"
        : "New Chapter"
      : tab === "sops"
        ? "New SOP"
        : "New Quiz";

  const isLoading =
    (tab === "chapters" && chaptersLoading) ||
    (tab === "sops" && sopsLoading) ||
    (tab === "quizzes" && quizzesLoading);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isFounder ? "Founder Knowledge Library" : "Content Management"}
        description={
          isFounder
            ? "Publish guidance, SOPs, and training to every department"
            : "Create, edit, publish, and archive learning content"
        }
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        }
      />

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Chapters" value={stats.chapters.total} icon={BookOpen}
            description={`${stats.chapters.published} published · ${stats.chapters.draft} draft`} />
          <StatCard title="SOPs" value={stats.sops.total} icon={FileText}
            description={`${stats.sops.published} published · ${stats.sops.draft} draft`} />
          <StatCard title="Quizzes" value={stats.quizzes.total} icon={ClipboardList}
            description={`${stats.quizzes.published} published · ${stats.quizzes.draft} draft`} />
          <StatCard title="Total Content" value={stats.chapters.total + stats.sops.total + stats.quizzes.total} icon={Layers} />
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="chapters">Chapters</TabsTrigger>
            <TabsTrigger value="sops">SOPs</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="chapters" className="mt-4">
          {isLoading ? <LoadingSkeleton rows={4} /> : !chaptersData?.data?.length ? (
            <EmptyState icon={BookOpen} title="No chapters" description="Create your first learning chapter." />
          ) : (
            <ContentTable
              items={chaptersData.data}
              renderMeta={(ch: ChapterRecord & { department: { name: string }; updatedAt: string }) => (
                <span>{ch.department.name} · {ch.estimatedMinutes}m · {formatDate(ch.updatedAt)}</span>
              )}
              onEdit={(ch) => handleEditChapter(ch)}
              onArchive={(id) => archiveChapter.mutate(id)}
            />
          )}
        </TabsContent>

        <TabsContent value="sops" className="mt-4">
          {isLoading ? <LoadingSkeleton rows={4} /> : !sopsData?.data?.length ? (
            <EmptyState icon={FileText} title="No SOPs" description="Create your first standard operating procedure." />
          ) : (
            <ContentTable
              items={sopsData.data}
              renderMeta={(sop: SOPRecord & { department: { name: string }; version: number; updatedAt: string }) => (
                <span>{sop.department.name} · v{sop.version} · {formatDate(sop.updatedAt)}</span>
              )}
              onEdit={(sop) => handleEditSOP(sop)}
              onArchive={(id) => archiveSOP.mutate(id)}
            />
          )}
        </TabsContent>

        <TabsContent value="quizzes" className="mt-4">
          {isLoading ? <LoadingSkeleton rows={4} /> : !quizzesData?.data?.length ? (
            <EmptyState icon={ClipboardList} title="No quizzes" description="Create your first mock test assessment." />
          ) : (
            <QuizContentTable
              items={quizzesData.data}
              renderMeta={(q: QuizRecord & { department?: { name: string } | null; questionCount: number; updatedAt: string }) => (
                <span>{q.department?.name ?? "All"} · {q.questionCount} questions · {formatDate(q.updatedAt)}</span>
              )}
              onEdit={(q) => { setEditingQuiz(q); setQuizDialog(true); }}
              onQuestions={(q) => { setQuestionsQuiz(q); setQuestionsDialog(true); }}
              onArchive={(id) => archiveQuiz.mutate(id)}
            />
          )}
        </TabsContent>
      </Tabs>

      <ChapterFormDialog
        open={chapterDialog}
        onOpenChange={setChapterDialog}
        chapter={editingChapter}
        departments={departments}
        lockedDepartmentId={lockedDept}
        allowPublishToAll={isFounder}
        onSubmit={async (data) => {
          if (editingChapter) {
            await updateChapter.mutateAsync({ id: editingChapter.id, payload: data });
            return { id: editingChapter.id };
          }
          const created = await createChapter.mutateAsync(data);
          if (created?.bulk) {
            return { id: created.chapters?.[0]?.id as string };
          }
          return { id: created.id as string };
        }}
      />

      <SOPFormDialog
        open={sopDialog}
        onOpenChange={setSOPDialog}
        sop={editingSOP}
        departments={departments}
        lockedDepartmentId={lockedDept}
        onSubmit={async (data) => {
          if (editingSOP) {
            await updateSOP.mutateAsync({ id: editingSOP.id, payload: data });
            return { id: editingSOP.id };
          }
          const created = await createSOP.mutateAsync(data);
          return { id: created.id as string };
        }}
      />

      <QuizFormDialog
        open={quizDialog}
        onOpenChange={setQuizDialog}
        quiz={editingQuiz}
        departments={departments}
        lockedDepartmentId={lockedDept}
        onSubmit={async (data) => {
          if (editingQuiz) {
            await updateQuiz.mutateAsync({ id: editingQuiz.id, payload: data });
            return { id: editingQuiz.id };
          }
          const created = await createQuiz.mutateAsync(data);
          setQuestionsQuiz(created as QuizRecord);
          setQuestionsDialog(true);
          return { id: created.id as string };
        }}
      />

      <QuizQuestionsDialog
        open={questionsDialog}
        onOpenChange={setQuestionsDialog}
        quizId={questionsQuiz?.id ?? null}
        quizTitle={questionsQuiz?.title}
      />
    </div>
  );
}

interface ContentItem {
  id: string;
  title: string;
  status: string;
}

function QuizContentTable<T extends ContentItem>({
  items,
  renderMeta,
  onEdit,
  onQuestions,
  onArchive,
}: {
  items: T[];
  renderMeta: (item: T) => React.ReactNode;
  onEdit: (item: T) => void;
  onQuestions: (item: T) => void;
  onArchive: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="divide-y p-0">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{renderMeta(item)}</p>
            </div>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[item.status])}>
              {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] ?? item.status}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => onQuestions(item)} title="Manage MCQ questions">
                <ListChecks className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" asChild title="View candidate scores">
                <Link href={`/admin/quizzes/${item.id}/scores`}>
                  <BarChart3 className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onEdit(item)} title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              {item.status !== "ARCHIVED" && (
                <Button variant="ghost" size="icon" onClick={() => onArchive(item.id)} title="Archive">
                  <Archive className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ContentTable<T extends ContentItem>({
  items,
  renderMeta,
  onEdit,
  onArchive,
}: {
  items: T[];
  renderMeta: (item: T) => React.ReactNode;
  onEdit: (item: T) => void;
  onArchive: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="divide-y p-0">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{renderMeta(item)}</p>
            </div>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[item.status])}>
              {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] ?? item.status}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(item)} title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              {item.status !== "ARCHIVED" && (
                <Button variant="ghost" size="icon" onClick={() => onArchive(item.id)} title="Archive">
                  <Archive className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
