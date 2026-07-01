import { cn } from "@/lib/utils";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/types";

export function TaskStatusBadge({ status }: { status: keyof typeof TASK_STATUS_LABELS }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "COMPLETED" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        status === "IN_PROGRESS" && "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
        status === "ASSIGNED" && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
        status === "CANCELLED" && "bg-muted text-muted-foreground"
      )}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const label = TASK_PRIORITY_LABELS[priority as keyof typeof TASK_PRIORITY_LABELS] ?? priority;
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        priority === "URGENT" && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
        priority === "HIGH" && "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
        priority === "MEDIUM" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        priority === "LOW" && "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}
