"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ListTodo, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

async function fetchMyTasks(status?: string) {
  const params = new URLSearchParams({ limit: "50" });
  if (status && status !== "all") params.set("status", status);
  const res = await fetch(`/api/employee-tasks?${params}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function MyTasksPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["my-employee-tasks", statusFilter],
    queryFn: () => fetchMyTasks(statusFilter),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/employee-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-employee-tasks"] });
      toast.success("Task updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tasks = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks"
        description="Tasks assigned to you by your manager"
      />

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
          title="No tasks assigned"
          description="When your manager assigns you work, it will appear here."
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
            assignedBy: { firstName: string; lastName: string };
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
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" />
                      From {task.assignedBy.firstName} {task.assignedBy.lastName}
                    </span>
                    {task.dueDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {task.status === "ASSIGNED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: task.id, status: "IN_PROGRESS" })}
                    >
                      Start
                    </Button>
                  )}
                  {task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus.mutate({ id: task.id, status: "COMPLETED" })}
                    >
                      Mark complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
