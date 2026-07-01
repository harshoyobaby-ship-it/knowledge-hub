"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Building2,
  BookOpen,
  FileText,
  ClipboardList,
  Users,
  UserCog,
  ArrowRight,
  FolderOpen,
  GraduationCap,
  Route,
  Bot,
  ListTodo,
  Mail,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444"];

async function fetchAdminStats() {
  const res = await fetch("/api/admin/stats", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

const quickLinks = [
  { href: "/admin/tasks", label: "Founder Tasks", description: "Assign tasks to departments", icon: ListTodo },
  { href: "/admin/users", label: "Users", description: "Create, suspend, assign roles", icon: UserCog },
  { href: "/admin/content", label: "Knowledge Base", description: "Chapters, SOPs, quizzes", icon: FolderOpen },
  { href: "/admin/courses", label: "Courses", description: "Modules, lessons, uploads", icon: GraduationCap },
  { href: "/admin/learning-paths", label: "Learning Paths", description: "Onboarding journeys", icon: Route },
  { href: "/departments", label: "Departments", description: "Org structure", icon: Building2 },
  { href: "/assistant", label: "AI Settings", description: "RAG & vector database", icon: Bot },
  { href: "/admin/email", label: "Email Automation", description: "Weekly training reminders", icon: Mail },
];

export default function AdminPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
  });

  if (isLoading) return <LoadingSkeleton rows={6} />;

  const pieData = stats
    ? [
        { name: "Completed", value: stats.completionRate },
        { name: "Remaining", value: 100 - stats.completionRate },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Panel" description="Enterprise LMS overview and management" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} description={`${stats?.activeUsers ?? 0} active`} />
        <StatCard title="New This Month" value={stats?.newUsersThisMonth ?? 0} icon={Users} />
        <StatCard title="Departments" value={stats?.totalDepartments ?? 0} icon={Building2} />
        <StatCard title="Courses" value={stats?.totalCourses ?? 0} icon={GraduationCap} />
        <StatCard title="Learning Paths" value={stats?.totalLearningPaths ?? 0} icon={Route} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Chapters" value={stats?.totalChapters ?? 0} icon={BookOpen} />
        <StatCard title="SOPs" value={stats?.totalSOPs ?? 0} icon={FileText} />
        <StatCard title="Quizzes" value={stats?.totalQuizzes ?? 0} icon={ClipboardList} />
        <StatCard title="Quiz Pass Rate" value={`${stats?.quizPassRate ?? 0}%`} icon={ClipboardList} />
      </div>

      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <link.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Learning Completion</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Platform Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Completion rate</span><span className="font-medium">{stats?.completionRate ?? 0}%</span></div>
            <div className="flex justify-between"><span>Quiz attempts</span><span className="font-medium">{stats?.quizAttempts ?? 0}</span></div>
            <div className="flex justify-between"><span>RAG documents</span><span className="font-medium">{stats?.ragDocuments ?? 0}</span></div>
            <div className="flex justify-between"><span>Audit logs today</span><span className="font-medium">{stats?.auditLogsToday ?? 0}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
