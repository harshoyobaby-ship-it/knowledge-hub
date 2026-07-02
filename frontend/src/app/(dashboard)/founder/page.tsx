"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  BookOpen,
  ListTodo,
  Users,
  Plus,
  ArrowRight,
  Crown,
  FolderOpen,
  Route,
  GraduationCap,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

async function fetchCoverage() {
  const res = await fetch("/api/founder/coverage", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

const quickActions = [
  {
    href: "/admin/content?publishAll=1",
    label: "Broadcast Knowledge",
    description: "Publish one chapter to every department at once",
    icon: BookOpen,
  },
  {
    href: "/admin/tasks?allDepts=1",
    label: "Broadcast Task",
    description: "Assign the same directive to all departments",
    icon: ListTodo,
  },
  {
    href: "/admin/content",
    label: "Publish Knowledge",
    description: "Share chapters, SOPs, and quizzes with one department",
    icon: FolderOpen,
  },
  {
    href: "/admin/tasks",
    label: "Assign Department Tasks",
    description: "Set priorities and track follow-through",
    icon: ListTodo,
  },
  {
    href: "/admin/courses",
    label: "Create Courses",
    description: "Build structured learning for each team",
    icon: GraduationCap,
  },
  {
    href: "/admin/learning-paths",
    label: "Learning Paths",
    description: "Onboarding journeys per department",
    icon: Route,
  },
  {
    href: "/departments",
    label: "Manage Departments",
    description: "Org structure and team assignments",
    icon: Building2,
  },
  {
    href: "/admin/users",
    label: "Team Members",
    description: "Add employees and assign roles",
    icon: Users,
  },
];

export default function FounderHubPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["founder-coverage"],
    queryFn: fetchCoverage,
  });

  if (isLoading) return <LoadingSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.firstName ?? "Founder"}`}
        description="Your command center to provide knowledge and direction to every department at Kharesiya Brands"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/tasks?allDepts=1">
                <ListTodo className="mr-2 h-4 w-4" />
                Task to all departments
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/content?publishAll=1">
                <BookOpen className="mr-2 h-4 w-4" />
                Knowledge to all departments
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/content">
                <Plus className="mr-2 h-4 w-4" />
                Publish to one department
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
        <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-100">Founder knowledge hub</p>
          <p className="mt-1 text-amber-800/90 dark:text-amber-200/80">
            Publish guidance once to all departments, add personal founder notes on each chapter,
            and assign tasks so every team knows what to follow.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Departments" value={data?.totals?.departments ?? 0} icon={Building2} />
        <StatCard title="Published Chapters" value={data?.totals?.publishedChapters ?? 0} icon={BookOpen} />
        <StatCard title="Open Tasks" value={data?.totals?.openTasks ?? 0} icon={ListTodo} />
        <StatCard title="Team Members" value={data?.totals?.members ?? 0} icon={Users} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Department knowledge coverage</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/content">
              <FolderOpen className="mr-2 h-4 w-4" />
              Manage content
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Department</th>
                <th className="pb-3 pr-4 font-medium">Members</th>
                <th className="pb-3 pr-4 font-medium">Chapters</th>
                <th className="pb-3 pr-4 font-medium">SOPs</th>
                <th className="pb-3 pr-4 font-medium">Courses</th>
                <th className="pb-3 pr-4 font-medium">Open tasks</th>
                <th className="pb-3 font-medium">Latest knowledge</th>
              </tr>
            </thead>
            <tbody>
              {data?.coverage?.map((dept: {
                id: string;
                name: string;
                memberCount: number;
                publishedChapters: number;
                publishedSops: number;
                publishedCourses: number;
                openTasks: number;
                latestChapter: { title: string; publishedAt: string } | null;
              }) => (
                <tr key={dept.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{dept.name}</td>
                  <td className="py-3 pr-4">{dept.memberCount}</td>
                  <td className="py-3 pr-4">{dept.publishedChapters}</td>
                  <td className="py-3 pr-4">{dept.publishedSops}</td>
                  <td className="py-3 pr-4">{dept.publishedCourses}</td>
                  <td className="py-3 pr-4">{dept.openTasks}</td>
                  <td className="py-3 text-muted-foreground">
                    {dept.latestChapter ? (
                      <span>
                        {dept.latestChapter.title}
                        <span className="block text-xs">
                          {formatDate(dept.latestChapter.publishedAt)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-amber-600">No content yet</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Founder actions</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
