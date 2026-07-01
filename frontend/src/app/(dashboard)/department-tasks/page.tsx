"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ListTodo, Building2, Calendar, ArrowRight } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";

async function fetchDepartmentTasks(status?: string) {
  const params = new URLSearchParams({ limit: "100" });
  if (status && status !== "all") params.set("status", status);
  const res = await fetch(`/api/department-tasks?${params}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function DepartmentTasksPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["department-tasks", statusFilter],
    queryFn: () => fetchDepartmentTasks(statusFilter),
  });

  const tasks = data?.data ?? [];
  const openCount = tasks.filter((t: { status: string }) => t.status !== "COMPLETED" && t.status !== "CANCELLED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Tasks"
        description={
          user?.department?.name
            ? `Tasks assigned to ${user.department.name} by leadership`
            : "Follow up on tasks assigned to your department"
        }
      />

      {user?.department?.name && (
        <div className="flex items-center gap-2 rounded-lg border bg-primary/5 px-4 py-3 text-sm">
          <Building2 className="h-4 w-4" />
          <span>
            <strong>{openCount}</strong> open task{openCount === 1 ? "" : "s"} for {user.department.name}
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
          title="No tasks for your department"
          description="When leadership assigns tasks, they will appear here for your team to follow."
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
            _count: { updates: number };
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
                    {task.description || "No instructions provided"}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Assigned by {task.assignedBy.firstName} {task.assignedBy.lastName}</span>
                    {task.dueDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Due {formatDate(task.dueDate)}
                      </span>
                    )}
                    <span>{task._count.updates} follow-up updates</span>
                  </div>
                </div>
                <Button asChild>
                  <Link href={`/department-tasks/${task.id}`}>
                    {task.status === "ASSIGNED" ? "Start follow-up" : "View task"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
