"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus, Pencil, Archive, GraduationCap, ChevronDown, ChevronRight, Upload, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { STATUS_LABELS, DIFFICULTY_LABELS } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import { getScopedDepartment, filterDepartmentsForUser } from "@/lib/department-scope";
import { LockedDepartmentField } from "@/components/admin/locked-department-field";
import {
  FileUploadField,
  type ExistingAttachment,
} from "@/components/admin/file-upload-field";

interface Department { id: string; name: string }

async function syncCourseAttachments(
  courseId: string,
  files: ExistingAttachment[],
  initialIds: string[]
) {
  const currentIds = files.filter((f) => !f.id.startsWith("pending-")).map((f) => f.id);
  const removed = initialIds.filter((id) => !currentIds.includes(id));

  for (const id of removed) {
    await fetch(`/api/courses/${courseId}/attachments?attachmentId=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
  }

  for (const file of files.filter((f) => f.id.startsWith("pending-"))) {
    await fetch(`/api/courses/${courseId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        url: file.url,
      }),
      credentials: "include",
    });
  }
}

async function fetchCourses() {
  const res = await fetch("/api/courses?manage=true&limit=50", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data.data;
}

async function fetchCourseDetail(id: string) {
  const res = await fetch(`/api/courses/${id}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

async function fetchDepartments(): Promise<Department[]> {
  const res = await fetch("/api/departments", { credentials: "include" });
  const json = await res.json();
  return json.data;
}

export default function AdminCoursesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [courseDialog, setCourseDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", departmentId: "", difficulty: "BEGINNER",
    estimatedHours: 1, status: "DRAFT", isSelfPaced: true,
  });
  const [moduleTitle, setModuleTitle] = useState("");
  const [lessonForm, setLessonForm] = useState({
    moduleId: "", title: "", content: "", contentType: "TEXT", durationMinutes: 10,
  });
  const [uploading, setUploading] = useState(false);
  const [pendingResources, setPendingResources] = useState<Record<string, unknown>[]>([]);
  const [courseAttachments, setCourseAttachments] = useState<ExistingAttachment[]>([]);
  const [initialCourseAttachmentIds, setInitialCourseAttachmentIds] = useState<string[]>([]);

  const scopedDept = getScopedDepartment(user);
  const lockedDept = scopedDept?.id ?? null;
  const lockedDeptName = scopedDept?.name ?? null;

  const { data: courses, isLoading } = useQuery({
    queryKey: ["manage-courses"],
    queryFn: fetchCourses,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: fetchDepartments,
  });

  const visibleDepartments = filterDepartmentsForUser(departments, scopedDept);

  const { data: detail, refetch: refetchDetail } = useQuery({
    queryKey: ["course-detail", expanded],
    queryFn: () => fetchCourseDetail(expanded!),
    enabled: !!expanded,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["manage-courses"] });
    queryClient.invalidateQueries({ queryKey: ["course-detail"] });
    queryClient.invalidateQueries({ queryKey: ["courses"] });
  };

  const saveCourse = useMutation({
    mutationFn: async () => {
      const url = editingId ? `/api/courses/${editingId}` : "/api/courses";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          departmentId: lockedDept ?? (form.departmentId || null),
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const courseId = (json.data?.id ?? editingId) as string;
      if (courseId) {
        await syncCourseAttachments(courseId, courseAttachments, initialCourseAttachmentIds);
      }
      return json.data;
    },
    onSuccess: () => {
      toast.success(editingId ? "Course updated" : "Course created");
      setCourseDialog(false);
      setCourseAttachments([]);
      setInitialCourseAttachmentIds([]);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addModule = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await fetch(`/api/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: moduleTitle }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success("Module added");
      setModuleTitle("");
      refetchDetail();
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addLesson = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/courses/modules/${lessonForm.moduleId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: lessonForm.title,
          content: lessonForm.content,
          contentType: lessonForm.contentType,
          durationMinutes: lessonForm.durationMinutes,
          resources: pendingResources,
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success("Lesson added");
      setLessonForm({ moduleId: "", title: "", content: "", contentType: "TEXT", durationMinutes: 10 });
      setPendingResources([]);
      refetchDetail();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPendingResources((r) => [...r, json.data]);
      setLessonForm((f) => ({ ...f, contentType: json.data.resourceType }));
      toast.success("File uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: "", description: "", departmentId: lockedDept ?? "",
      difficulty: "BEGINNER", estimatedHours: 1, status: "DRAFT", isSelfPaced: true,
    });
    setCourseAttachments([]);
    setInitialCourseAttachmentIds([]);
    setCourseDialog(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course Management"
        description="Build courses with modules, lessons, and file uploads"
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New Course</Button>}
      />

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : !courses?.length ? (
        <EmptyState icon={GraduationCap} title="No courses yet" description="Create your first LMS course." />
      ) : (
        <div className="space-y-3">
          {courses.map((course: { id: string; title: string; status: string; department?: { name: string }; updatedAt: string; moduleCount: number }) => (
            <Card key={course.id}>
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 text-left"
                  onClick={() => setExpanded(expanded === course.id ? null : course.id)}
                >
                  {expanded === course.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <div>
                    <CardTitle className="text-base">{course.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {course.department?.name ?? "All"} · {course.moduleCount} modules · {formatDate(course.updatedAt)}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
                    course.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-muted"
                  )}>{STATUS_LABELS[course.status as keyof typeof STATUS_LABELS]}</span>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/courses/${course.id}/learn`}><GraduationCap className="h-4 w-4" /></Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={async () => {
                    const d = await fetchCourseDetail(course.id);
                    setEditingId(course.id);
                    setForm({
                      title: d.title,
                      description: d.description ?? "",
                      departmentId: d.department?.id ?? "",
                      difficulty: d.difficulty,
                      estimatedHours: d.estimatedHours,
                      status: d.status,
                      isSelfPaced: d.isSelfPaced,
                    });
                    const existing = (d.attachments ?? []) as ExistingAttachment[];
                    setCourseAttachments(existing);
                    setInitialCourseAttachmentIds(existing.map((a) => a.id));
                    setCourseDialog(true);
                  }}><Pencil className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              {expanded === course.id && detail && (
                <CardContent className="space-y-4 border-t pt-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="New module title..."
                      value={moduleTitle}
                      onChange={(e) => setModuleTitle(e.target.value)}
                    />
                    <Button
                      disabled={!moduleTitle.trim()}
                      onClick={() => addModule.mutate(course.id)}
                    >Add Module</Button>
                  </div>
                  {detail.modules.map((mod: { id: string; title: string; lessons: { id: string; title: string; contentType: string }[] }) => (
                    <div key={mod.id} className="rounded-lg border p-4">
                      <p className="font-medium">{mod.title}</p>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {mod.lessons.map((l) => (
                          <li key={l.id}>· {l.title} ({l.contentType})</li>
                        ))}
                      </ul>
                      <div className="mt-3 space-y-2 rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-medium">Add lesson to {mod.title}</p>
                        <Input
                          placeholder="Lesson title"
                          value={lessonForm.moduleId === mod.id ? lessonForm.title : ""}
                          onChange={(e) => setLessonForm({ ...lessonForm, moduleId: mod.id, title: e.target.value })}
                        />
                        <Textarea
                          placeholder="HTML content (optional for file-only lessons)"
                          rows={2}
                          value={lessonForm.moduleId === mod.id ? lessonForm.content : ""}
                          onChange={(e) => setLessonForm({ ...lessonForm, moduleId: mod.id, content: e.target.value })}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Select
                            value={lessonForm.moduleId === mod.id ? lessonForm.contentType : "TEXT"}
                            onValueChange={(v) => setLessonForm({ ...lessonForm, moduleId: mod.id, contentType: v })}
                          >
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["TEXT", "VIDEO", "PDF", "DOCUMENT", "PPT"].map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            Upload file
                            <input
                              type="file"
                              className="hidden"
                              accept="video/*,.pdf,.ppt,.pptx,.doc,.docx"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  setLessonForm((lf) => ({ ...lf, moduleId: mod.id }));
                                  handleUpload(f);
                                }
                              }}
                            />
                          </label>
                          <Button
                            size="sm"
                            disabled={lessonForm.moduleId !== mod.id || !lessonForm.title.trim()}
                            onClick={() => addLesson.mutate()}
                          >Add Lesson</Button>
                        </div>
                        {lessonForm.moduleId === mod.id && pendingResources.length > 0 && (
                          <p className="text-xs text-emerald-600">{pendingResources.length} file(s) attached</p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={courseDialog} onOpenChange={setCourseDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Edit Course" : "New Course"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Department</Label>
                {lockedDept ? (
                  <LockedDepartmentField
                    departmentId={lockedDept}
                    departmentName={lockedDeptName}
                    departments={visibleDepartments}
                  />
                ) : (
                  <Select
                    value={form.departmentId || "__none__"}
                    onValueChange={(v) => setForm({ ...form, departmentId: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">All departments</SelectItem>
                      {visibleDepartments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <FileUploadField
              label="Course files (PDF, video, documents, PPT, Excel)"
              accept="video/*,.pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,.xls,.xlsx"
              files={courseAttachments}
              onFilesChange={setCourseAttachments}
            />
            <Button className="w-full" onClick={() => saveCourse.mutate()} disabled={!form.title.trim() || saveCourse.isPending}>
              {saveCourse.isPending ? "Saving..." : "Save Course"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
