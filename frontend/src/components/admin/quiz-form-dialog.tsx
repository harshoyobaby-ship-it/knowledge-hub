"use client";

import { useEffect } from "react";
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
import { createQuizSchema, updateQuizSchema } from "@/lib/validations";
import { STATUS_LABELS } from "@/types";

export interface QuizRecord {
  id: string;
  title: string;
  description?: string | null;
  departmentId?: string | null;
  passingPercentage: number;
  maxAttempts: number;
  status: string;
  department?: { id: string; name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface QuizFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz?: QuizRecord | null;
  departments: Department[];
  lockedDepartmentId?: string | null;
  onSubmit: (data: Record<string, unknown>) => Promise<{ id: string } | void>;
}

export function QuizFormDialog({
  open,
  onOpenChange,
  quiz,
  departments,
  lockedDepartmentId,
  onSubmit,
}: QuizFormDialogProps) {
  const isEdit = !!quiz;
  const schema = isEdit ? updateQuizSchema : createQuizSchema;

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
      description: "",
      departmentId: lockedDepartmentId ?? "",
      passingPercentage: 70,
      maxAttempts: 3,
      status: "DRAFT",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: quiz?.title ?? "",
        description: quiz?.description ?? "",
        departmentId: quiz?.department?.id ?? quiz?.departmentId ?? lockedDepartmentId ?? "",
        passingPercentage: quiz?.passingPercentage ?? 70,
        maxAttempts: quiz?.maxAttempts ?? 3,
        status: (quiz?.status as "DRAFT") ?? "DRAFT",
      });
    }
  }, [open, quiz, lockedDepartmentId, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Quiz" : "New Quiz"}</DialogTitle>
          <DialogDescription>Create and manage assessments</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(async (data) => {
            await onSubmit({
              ...data,
              departmentId: data.departmentId || null,
            });
            onOpenChange(false);
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="quiz-title">Title</Label>
            <Input id="quiz-title" {...register("title")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quiz-desc">Description</Label>
            <Textarea id="quiz-desc" rows={2} {...register("description")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Controller
                name="departmentId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={!!lockedDepartmentId}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
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
              <Label htmlFor="passing">Passing %</Label>
              <Input id="passing" type="number" {...register("passingPercentage", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attempts">Max Attempts</Label>
              <Input id="attempts" type="number" {...register("maxAttempts", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Quiz"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
