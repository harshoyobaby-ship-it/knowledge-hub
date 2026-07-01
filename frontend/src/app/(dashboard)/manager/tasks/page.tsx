"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ListTodo, User, Calendar, Building2 } from "lucide-react";
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
import { TASK_STATUS_LABELS } from "@/types";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { getScopedDepartment } from "@/lib/department-scope";

async function fetchTasks(status?: string) {
  const params = new URLSearchParams({ manage: "true", limit: "100" });
  if (status && status !== "all") params.set("status", status);
  const res = await fetch(`/api/employee-tasks?${params}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

async function fetchTeam() {
  const res = await fetch("/api/manager/employees", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function ManagerTasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scopedDept = getScopedDepartment(user);
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    priority: "MEDIUM",
    dueDate: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["manager-employee-tasks", statusFilter],
    queryFn: () => fetchTasks(statusFilter),
  });

  const { data: teamData } = useQuery({
    queryKey: ["manager-team"],
    queryFn: fetchTeam,
  });

  const employees = teamData?.employees ?? [];

  const createTask = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/employee-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-employee-tasks"] });
      toast.success("Task assigned to employee");
      setOpen(false);
      setForm({ title: "", description: "", assigneeId: "", priority: "MEDIUM", dueDate: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tasks = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Task Assignments"
        description={
          scopedDept?.name
            ? `Assign tasks to employees in ${scopedDept.name} only`
            : "Assign tasks to employees in your department"
        }
        actions={
          <Button onClick={() => setOpen(true)} disabled={!employees.length}>
            <Plus className="h-4 w-4" />
            Assign to Employee
          </Button>
        }
      />

      {scopedDept && (
        <div className="flex items-center gap-2 rounded-lg border bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          <Building2 className="h-4 w-4" />
          <span>
            Department: <strong>{scopedDept.name}</strong> — tasks stay within your team. Founder tasks for your department are under <strong>Founder Tasks</strong>.
          </span>
        </div>
      )}

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

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : !tasks.length ? (
        <EmptyState
          icon={ListTodo}
          title="No team tasks yet"
          description="Assign work to employees in your department. Founder-wide directives appear separately under Department Tasks."
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
            assignee: { firstName: string; lastName: string };
          }) => (
            <Card key={task.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{task.title}</p>
                    <TaskStatusBadge status={task.status} />
                    <TaskPriorityBadge priority={task.priority} />
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {task.assignee.firstName} {task.assignee.lastName}
                    </span>
                    {task.dueDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign task to employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={form.assigneeId}
                onValueChange={(v) => setForm({ ...form, assigneeId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: { id: string; firstName: string; lastName: string; email: string }) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!form.title || !form.assigneeId || createTask.isPending}
              onClick={() => createTask.mutate()}
            >
              {createTask.isPending ? "Assigning..." : "Assign Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
