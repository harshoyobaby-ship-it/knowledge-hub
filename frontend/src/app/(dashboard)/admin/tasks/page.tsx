"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, ListTodo, Building2, Calendar, ArrowRight, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/tasks/task-badges";
import { FileUploadField, type ExistingAttachment } from "@/components/admin/file-upload-field";
import { TASK_STATUS_LABELS } from "@/types";
import { formatDate } from "@/lib/utils";

async function fetchTasks(status?: string, departmentId?: string) {
  const params = new URLSearchParams({ manage: "true", limit: "100" });
  if (status && status !== "all") params.set("status", status);
  if (departmentId && departmentId !== "all") params.set("departmentId", departmentId);
  const res = await fetch(`/api/department-tasks?${params}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

async function fetchDepartments() {
  const res = await fetch("/api/departments", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function FounderTasksPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [form, setForm] = useState({
    title: "",
    description: "",
    departmentId: "",
    priority: "MEDIUM",
    dueDate: "",
  });
  const [attachments, setAttachments] = useState<ExistingAttachment[]>([]);

  function resetForm() {
    setForm({ title: "", description: "", departmentId: "", priority: "MEDIUM", dueDate: "" });
    setAttachments([]);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["founder-tasks", statusFilter, departmentFilter],
    queryFn: () => fetchTasks(statusFilter, departmentFilter),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: fetchDepartments,
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/department-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          attachments: attachments.length
            ? attachments.map(({ filename, originalName, mimeType, size, url }) => ({
                filename,
                originalName,
                mimeType,
                size,
                url,
              }))
            : undefined,
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["founder-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["department-tasks"] });
      toast.success("Task assigned to department");
      setOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tasks = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Founder Task Assignments"
        description="Assign directives to departments and track follow-through"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Assign Task
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d: { id: string; name: string }) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : !tasks.length ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks assigned yet"
          description="Assign your first task to a department to get started."
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task: {
            id: string;
            title: string;
            description?: string;
            status: keyof typeof TASK_STATUS_LABELS;
            priority: string;
            dueDate?: string;
            department: { name: string };
            _count: { updates: number };
            attachments?: { id: string }[];
          }) => (
            <Card key={task.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{task.title}</p>
                    <TaskStatusBadge status={task.status} />
                    <TaskPriorityBadge priority={task.priority} />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description || "No description"}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {task.department.name}
                    </span>
                    {task.dueDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Due {formatDate(task.dueDate)}
                      </span>
                    )}
                    <span>{task._count.updates} updates</span>
                    {(task.attachments?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" />
                        {task.attachments!.length} file{task.attachments!.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/department-tasks/${task.id}`}>
                    View follow-up
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign task to department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Task title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Complete SKU artwork review for Q3 launch"
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Select
                value={form.departmentId}
                onValueChange={(v) => setForm({ ...form, departmentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d: { id: string; name: string }) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Instructions</Label>
              <Textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What should this department deliver or follow up on?"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dueDate">Due date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
            <FileUploadField
              label="Task attachments — also published as SOP for search & learning"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,.xls,.xlsx"
              files={attachments}
              onFilesChange={setAttachments}
            />
            <Button
              className="w-full"
              disabled={!form.title || !form.departmentId || createTask.isPending}
              onClick={() => createTask.mutate()}
            >
              Assign to department
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
