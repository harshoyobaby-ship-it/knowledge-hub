"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Route } from "lucide-react";
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
import { STATUS_LABELS } from "@/types";
import { cn } from "@/lib/utils";

async function fetchPaths() {
  const res = await fetch("/api/learning-paths?manage=true&limit=50", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data.data;
}

async function fetchDepartments() {
  const res = await fetch("/api/departments", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function AdminLearningPathsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    departmentId: "",
    durationDays: 7,
    passingScore: 70,
    status: "DRAFT",
  });

  const { data: paths, isLoading } = useQuery({
    queryKey: ["admin-learning-paths"],
    queryFn: fetchPaths,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: fetchDepartments,
  });

  const createPath = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/learning-paths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          departmentId: form.departmentId || null,
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-learning-paths"] });
      toast.success("Learning path created");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Paths"
        description="Department onboarding and role-based journeys"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New Path
          </Button>
        }
      />

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : !paths?.length ? (
        <EmptyState icon={Route} title="No learning paths" description="Create your first onboarding journey." />
      ) : (
        <div className="space-y-3">
          {paths.map((p: { id: string; name: string; description?: string; status: string; durationDays: number; department?: { name: string }; itemCount: number }) => (
            <Card key={p.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <Route className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.department?.name ?? "All"} · {p.itemCount} items · {p.durationDays} days
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium",
                  p.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-muted"
                )}>
                  {STATUS_LABELS[p.status as keyof typeof STATUS_LABELS]}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Learning Path</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={form.departmentId || "__none__"} onValueChange={(v) => setForm({ ...form, departmentId: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All departments</SelectItem>
                  {departments.map((d: { id: string; name: string }) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!form.name.trim() || createPath.isPending} onClick={() => createPath.mutate()}>
              Create Path
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
