"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/tasks/task-badges";
import { TASK_STATUS_LABELS } from "@/types";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@prisma/client";

async function fetchTask(id: string) {
  const res = await fetch(`/api/department-tasks/${id}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function DepartmentTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string>("");

  const { data: task, isLoading } = useQuery({
    queryKey: ["department-task", id],
    queryFn: () => fetchTask(id),
    enabled: !!id,
  });

  const isFounder = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;
  const isManager =
    user?.role === UserRole.MANAGER || user?.role === UserRole.DEPARTMENT_HEAD;

  const updateTask = useMutation({
    mutationFn: async (payload: { status?: string; note?: string }) => {
      const res = await fetch(`/api/department-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-task", id] });
      queryClient.invalidateQueries({ queryKey: ["department-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["founder-tasks"] });
      toast.success("Task updated");
      setNote("");
      setStatus("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (!task) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/department-tasks"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
        </Button>
        <p className="text-muted-foreground">Task not found</p>
      </div>
    );
  }

  const canStart = task.status === "ASSIGNED";
  const canComplete = isManager || isFounder;
  const statusOptions = [
    ...(canStart ? [{ value: "IN_PROGRESS", label: "Start working (In Progress)" }] : []),
    ...(task.status === "IN_PROGRESS" && canComplete
      ? [{ value: "COMPLETED", label: "Mark complete" }]
      : []),
    ...(isFounder && task.status !== "CANCELLED"
      ? [{ value: "CANCELLED", label: "Cancel task" }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={isFounder ? "/admin/tasks" : "/department-tasks"}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to tasks
        </Link>
      </Button>

      <PageHeader
        title={task.title}
        description={task.department.name}
        actions={
          <div className="flex gap-2">
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Instructions from leadership</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {task.description || "No detailed instructions provided."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Follow-up timeline</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {task.updates?.length ? (
                task.updates.map((update: {
                  id: string;
                  status?: keyof typeof TASK_STATUS_LABELS;
                  note?: string;
                  createdAt: string;
                  user: { firstName: string; lastName: string };
                }) => (
                  <div key={update.id} className="rounded-lg border p-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">
                        {update.user.firstName} {update.user.lastName}
                      </span>
                      {update.status && <TaskStatusBadge status={update.status} />}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(update.createdAt)}
                      </span>
                    </div>
                    {update.note && (
                      <p className="text-sm text-muted-foreground">{update.note}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No follow-up updates yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Task details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>
                  Assigned by {task.assignedBy.firstName} {task.assignedBy.lastName}
                </span>
              </div>
              {task.dueDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Due {formatDate(task.dueDate)}</span>
                </div>
              )}
              {task.completedAt && task.completedBy && (
                <p className="text-emerald-700 dark:text-emerald-300">
                  Completed by {task.completedBy.firstName} {task.completedBy.lastName} on{" "}
                  {formatDate(task.completedAt)}
                </p>
              )}
            </CardContent>
          </Card>

          {task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
            <Card>
              <CardHeader><CardTitle>Department follow-up</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {statusOptions.length > 0 && (
                  <div>
                    <Label>Update status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue placeholder="Choose action" /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label htmlFor="note">Add update note</Label>
                  <Textarea
                    id="note"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Share progress, blockers, or completion details..."
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={updateTask.isPending || (!note && !status)}
                  onClick={() =>
                    updateTask.mutate({
                      ...(status ? { status } : {}),
                      ...(note ? { note } : {}),
                    })
                  }
                >
                  {canStart && !status && !note ? "Start task or add note" : "Submit update"}
                </Button>
                {canStart && (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={updateTask.isPending}
                    onClick={() => updateTask.mutate({ status: "IN_PROGRESS", note: "Task started by department" })}
                  >
                    Start task
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {isFounder && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                if (confirm("Delete this task permanently?")) {
                  fetch(`/api/department-tasks/${id}`, { method: "DELETE", credentials: "include" })
                    .then((res) => res.json())
                    .then((json) => {
                      if (!json.success) throw new Error(json.error);
                      toast.success("Task deleted");
                      router.push("/admin/tasks");
                    })
                    .catch((e: Error) => toast.error(e.message));
                }
              }}
            >
              Delete task
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
