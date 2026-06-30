"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, TrendingUp, AlertCircle, Building2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

interface EmployeeRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  overallProgress: number;
  completedModules: number;
  pendingModules: number;
  lastActivity: string | null;
}

interface TeamResponse {
  department: { id: string; name: string } | null;
  employees: EmployeeRow[];
}

async function fetchTeam(): Promise<TeamResponse> {
  const res = await fetch("/api/manager/employees", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load team");
  return json.data;
}

export default function ManagerEmployeesPage() {
  const [search, setSearch] = useState("");
  const [progressFilter, setProgressFilter] = useState("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["manager-employees"],
    queryFn: fetchTeam,
  });

  const employees = data?.employees ?? [];

  const filtered = employees.filter((emp) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      emp.firstName.toLowerCase().includes(q) ||
      emp.lastName.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q);

    const matchesProgress =
      progressFilter === "all" ||
      (progressFilter === "complete" && emp.overallProgress >= 100) ||
      (progressFilter === "in-progress" &&
        emp.overallProgress > 0 &&
        emp.overallProgress < 100) ||
      (progressFilter === "not-started" && emp.overallProgress === 0);

    return matchesSearch && matchesProgress;
  });

  const avgProgress =
    employees.length > 0
      ? Math.round(
          employees.reduce((s, e) => s + e.overallProgress, 0) / employees.length
        )
      : 0;

  const behindCount = employees.filter((e) => e.overallProgress < 50).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Progress"
        description={
          data?.department
            ? `Training progress for ${data.department.name} department employees`
            : "Training progress for your department"
        }
      />

      {data?.department && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <Building2 className="h-4 w-4 text-primary" />
          <span>
            Managing department: <strong>{data.department.name}</strong>
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{employees.length}</p>
              <p className="text-sm text-muted-foreground">Team members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <TrendingUp className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">{avgProgress}%</p>
              <p className="text-sm text-muted-foreground">Average progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold">{behindCount}</p>
              <p className="text-sm text-muted-foreground">Below 50% progress</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employees</CardTitle>
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name or email..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={progressFilter} onValueChange={setProgressFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Progress" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All progress</SelectItem>
                <SelectItem value="complete">100% complete</SelectItem>
                <SelectItem value="in-progress">In progress</SelectItem>
                <SelectItem value="not-started">Not started</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton rows={6} />
          ) : error ? (
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employees in your department yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Employee</th>
                    <th className="pb-3 pr-4 font-medium">Progress</th>
                    <th className="pb-3 pr-4 font-medium">Completed</th>
                    <th className="pb-3 pr-4 font-medium">Pending</th>
                    <th className="pb-3 pr-4 font-medium">Last activity</th>
                    <th className="pb-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((emp) => (
                    <tr key={emp.id} className="hover:bg-muted/30">
                      <td className="py-3 pr-4">
                        <p className="font-medium">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{emp.email}</p>
                      </td>
                      <td className="py-3 pr-4 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <Progress value={emp.overallProgress} className="h-2 flex-1" />
                          <span className="w-10 text-right font-medium">
                            {emp.overallProgress}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">{emp.completedModules}</td>
                      <td className="py-3 pr-4">{emp.pendingModules}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {emp.lastActivity ? formatDate(emp.lastActivity) : "Never"}
                      </td>
                      <td className="py-3">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/manager/employees/${emp.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
