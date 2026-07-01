"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { chapterSchema, updateChapterSchema } from "@/lib/validations";
import { DIFFICULTY_LABELS, STATUS_LABELS } from "@/types";
import { FileUploadField, type ExistingAttachment } from "@/components/admin/file-upload-field";
import { LockedDepartmentField } from "@/components/admin/locked-department-field";

export interface ChapterRecord {
  id: string;
  title: string;
  description?: string | null;
  departmentId?: string;
  category?: string | null;
  difficulty: string;
  estimatedMinutes: number;
  content?: string;
  founderNotes?: string | null;
  status: string;
  department?: { id: string; name: string };
  attachments?: ExistingAttachment[];
}

interface Department {
  id: string;
  name: string;
}

interface ChapterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter?: ChapterRecord | null;
  departments: Department[];
  lockedDepartmentId?: string | null;
  lockedDepartmentName?: string | null;
  allowPublishToAll?: boolean;
  onSubmit: (data: Record<string, unknown>) => Promise<{ id: string } | void>;
}

async function syncChapterAttachments(
  chapterId: string,
  files: ExistingAttachment[],
  initialIds: string[]
) {
  const currentIds = files.filter((f) => !f.id.startsWith("pending-")).map((f) => f.id);
  const removed = initialIds.filter((id) => !currentIds.includes(id));

  for (const id of removed) {
    await fetch(`/api/chapters/${chapterId}/attachments?attachmentId=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
  }

  for (const file of files.filter((f) => f.id.startsWith("pending-"))) {
    await fetch(`/api/chapters/${chapterId}/attachments`, {
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

export function ChapterFormDialog({
  open,
  onOpenChange,
  chapter,
  departments,
  lockedDepartmentId,
  lockedDepartmentName,
  allowPublishToAll = false,
  onSubmit,
}: ChapterFormDialogProps) {
  const isEdit = !!chapter;
  const schema = isEdit ? updateChapterSchema : chapterSchema;
  const initialAttachmentIds = useRef<string[]>([]);
  const [attachments, setAttachments] = useState<ExistingAttachment[]>([]);
  const [publishToAll, setPublishToAll] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      departmentId: lockedDepartmentId ?? "",
      category: "",
      difficulty: "BEGINNER",
      estimatedMinutes: 30,
      content: "<h3>Overview</h3><p>Enter chapter content here...</p>",
      founderNotes: "",
      status: "DRAFT",
    },
  });

  useEffect(() => {
    if (open) {
      const existing = chapter?.attachments ?? [];
      initialAttachmentIds.current = existing.map((a) => a.id);
      setAttachments(existing);
      reset({
        title: chapter?.title ?? "",
        description: chapter?.description ?? "",
        departmentId: chapter?.department?.id ?? chapter?.departmentId ?? lockedDepartmentId ?? "",
        category: chapter?.category ?? "",
        difficulty: (chapter?.difficulty as "BEGINNER") ?? "BEGINNER",
        estimatedMinutes: chapter?.estimatedMinutes ?? 30,
        content: chapter?.content ?? "<h3>Overview</h3><p>Enter chapter content here...</p>",
        founderNotes: chapter?.founderNotes ?? "",
        status: (chapter?.status as "DRAFT") ?? "DRAFT",
        publishToAllDepartments: false,
      });
      setPublishToAll(false);
    }
  }, [open, chapter, lockedDepartmentId, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Chapter" : "Publish Knowledge"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update learning module content"
              : lockedDepartmentId
                ? "Share knowledge with your department team"
                : "Share knowledge with one department or publish to all teams at once"}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(async (data) => {
            const payload = {
              ...data,
              publishToAllDepartments: !isEdit && publishToAll,
            };
            const result = await onSubmit(payload);
            const chapterId = result?.id ?? chapter?.id;
            if (chapterId) {
              await syncChapterAttachments(chapterId, attachments, initialAttachmentIds.current);
            }
            onOpenChange(false);
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              {allowPublishToAll && !isEdit && (
                <label className="mb-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={publishToAll}
                    onChange={(e) => setPublishToAll(e.target.checked)}
                    className="rounded border-input"
                  />
                  Publish to all departments
                </label>
              )}
              {lockedDepartmentId ? (
                <LockedDepartmentField
                  departmentId={lockedDepartmentId}
                  departmentName={lockedDepartmentName}
                  departments={departments}
                />
              ) : (
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? undefined}
                      onValueChange={field.onChange}
                      disabled={publishToAll}
                    >
                      <SelectTrigger><SelectValue placeholder={publishToAll ? "All departments" : "Select department"} /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              {errors.departmentId && (
                <p className="text-xs text-destructive">{errors.departmentId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" {...register("category")} placeholder="Onboarding" />
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Controller
                name="difficulty"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedMinutes">Duration (min)</Label>
              <Input id="estimatedMinutes" type="number" {...register("estimatedMinutes", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content (HTML)</Label>
            <Textarea id="content" rows={6} className="font-mono text-xs" {...register("content")} />
            {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
          </div>

          <FileUploadField files={attachments} onFilesChange={setAttachments} />

          {!lockedDepartmentId && (
            <div className="space-y-2">
              <Label htmlFor="founderNotes">Message from Founder (shown to department)</Label>
              <Textarea
                id="founderNotes"
                rows={3}
                placeholder="Personal guidance or expectations for this department..."
                {...register("founderNotes")}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : publishToAll ? "Publish to all departments" : "Publish knowledge"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
