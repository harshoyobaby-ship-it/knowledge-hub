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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSOPSchema, updateSOPSchema } from "@/lib/validations";
import { STATUS_LABELS } from "@/types";
import { FileUploadField, type ExistingAttachment } from "@/components/admin/file-upload-field";
import { LockedDepartmentField } from "@/components/admin/locked-department-field";

export interface SOPRecord {
  id: string;
  title: string;
  departmentId?: string;
  effectiveDate: string;
  reviewDate?: string | null;
  status: string;
  department?: { id: string; name: string };
  attachments?: ExistingAttachment[];
}

interface Department {
  id: string;
  name: string;
}

interface SOPFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sop?: SOPRecord | null;
  departments: Department[];
  lockedDepartmentId?: string | null;
  lockedDepartmentName?: string | null;
  onSubmit: (data: Record<string, unknown>) => Promise<{ id: string } | void>;
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

async function syncSOPAttachments(
  sopId: string,
  files: ExistingAttachment[],
  initialIds: string[]
) {
  const currentIds = files.filter((f) => !f.id.startsWith("pending-")).map((f) => f.id);
  const removed = initialIds.filter((id) => !currentIds.includes(id));

  for (const id of removed) {
    await fetch(`/api/sops/${sopId}/attachments?attachmentId=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
  }

  for (const file of files.filter((f) => f.id.startsWith("pending-"))) {
    await fetch(`/api/sops/${sopId}/attachments`, {
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

export function SOPFormDialog({
  open,
  onOpenChange,
  sop,
  departments,
  lockedDepartmentId,
  lockedDepartmentName,
  onSubmit,
}: SOPFormDialogProps) {
  const isEdit = !!sop;
  const schema = isEdit ? updateSOPSchema : createSOPSchema;
  const initialAttachmentIds = useRef<string[]>([]);
  const [attachments, setAttachments] = useState<ExistingAttachment[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      departmentId: lockedDepartmentId ?? "",
      effectiveDate: new Date().toISOString().slice(0, 10),
      reviewDate: "",
      status: "DRAFT",
    },
  });

  useEffect(() => {
    if (open) {
      const existing = sop?.attachments ?? [];
      initialAttachmentIds.current = existing.map((a) => a.id);
      setAttachments(existing);
      reset({
        title: sop?.title ?? "",
        departmentId: sop?.department?.id ?? sop?.departmentId ?? lockedDepartmentId ?? "",
        effectiveDate: toDateInput(sop?.effectiveDate) || new Date().toISOString().slice(0, 10),
        reviewDate: toDateInput(sop?.reviewDate),
        status: (sop?.status as "DRAFT") ?? "DRAFT",
      });
    }
  }, [open, sop, lockedDepartmentId, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit SOP" : "New SOP"}</DialogTitle>
          <DialogDescription>Standard operating procedure document</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(async (data) => {
            const result = await onSubmit({
              ...data,
              reviewDate: data.reviewDate || null,
            });
            const sopId = result?.id ?? sop?.id;
            if (sopId) {
              await syncSOPAttachments(sopId, attachments, initialAttachmentIds.current);
            }
            onOpenChange(false);
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="sop-title">Title</Label>
            <Input id="sop-title" {...register("title")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="effectiveDate">Effective Date</Label>
              <Input id="effectiveDate" type="date" {...register("effectiveDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewDate">Review Date</Label>
              <Input id="reviewDate" type="date" {...register("reviewDate")} />
            </div>
          </div>

          <FileUploadField
            label="SOP file (PDF, document)"
            files={attachments}
            onFilesChange={setAttachments}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create SOP"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
