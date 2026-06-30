"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Users, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  DepartmentFormDialog,
  type DepartmentRecord,
} from "@/components/admin/department-form-dialog";

async function fetchDepartments(): Promise<DepartmentRecord[]> {
  const res = await fetch("/api/departments", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load departments");
  return json.data;
}

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRecord | null>(null);

  const { data: departments, isLoading, error } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
  });

  const saveDepartment = useMutation({
    mutationFn: async (payload: {
      id?: string;
      data: Record<string, unknown>;
    }) => {
      const url = payload.id ? `/api/departments/${payload.id}` : "/api/departments";
      const method = payload.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.data),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save department");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success(editing ? "Department updated" : "Department created");
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (e: React.MouseEvent, dept: DepartmentRecord) => {
    e.preventDefault();
    e.stopPropagation();
    setEditing(dept);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Manage organizational departments and team assignments"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Department
          </Button>
        }
      />

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : error ? (
        <EmptyState
          title="Could not load departments"
          description={(error as Error).message}
        />
      ) : !departments?.length ? (
        <EmptyState
          title="No departments yet"
          description="Create your first department to organize users and content."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Department
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {departments.map((dept) => (
            <Link key={dept.id} href={`/departments/${dept.id}`}>
              <Card className="group h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{dept.name}</CardTitle>
                        <span className="text-xs text-emerald-600">{dept.status}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      onClick={(e) => openEdit(e, dept)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {dept.description || "No description"}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {dept._count?.members ?? 0} members
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <DepartmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        department={editing}
        onSubmit={async (data) => {
          await saveDepartment.mutateAsync({
            id: editing?.id,
            data,
          });
        }}
      />
    </div>
  );
}
