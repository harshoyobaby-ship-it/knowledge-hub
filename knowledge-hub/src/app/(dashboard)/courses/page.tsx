"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock, Play, CheckCircle2, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABELS } from "@/types";

interface CourseItem {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  estimatedHours: number;
  isSelfPaced: boolean;
  department: { name: string } | null;
  moduleCount: number;
  myProgress: number | null;
  myCompleted: boolean;
}

async function fetchCourses(params: string): Promise<{ data: CourseItem[] }> {
  const res = await fetch(`/api/courses?${params}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function CoursesPage() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const params = new URLSearchParams({ limit: "50" });
  if (search) params.set("search", search);
  if (tab === "enrolled") params.set("enrolled", "true");

  const { data, isLoading } = useQuery({
    queryKey: ["courses", tab, search],
    queryFn: () => fetchCourses(params.toString()),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Courses"
        description="Self-paced training — learn anytime on desktop or mobile"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All Courses</TabsTrigger>
            <TabsTrigger value="enrolled">My Learning</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search courses..."
          className="max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : !data?.data?.length ? (
        <EmptyState
          icon={GraduationCap}
          title={tab === "enrolled" ? "No enrolled courses" : "No courses available"}
          description="Browse all courses or ask your manager to publish training."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.data.map((course) => (
            <Card key={course.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
              <div className="flex h-32 items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <BookOpen className="h-12 w-12 text-primary/60" />
              </div>
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <p className="font-semibold leading-tight">{course.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {course.description ?? "Self-paced learning course"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{course.department?.name ?? "All departments"}</span>
                  <span>·</span>
                  <span>{DIFFICULTY_LABELS[course.difficulty as keyof typeof DIFFICULTY_LABELS]}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />{course.estimatedHours}h
                  </span>
                </div>
                {course.myProgress != null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span className="font-medium">{course.myProgress}%</span>
                    </div>
                    <Progress value={course.myProgress} />
                  </div>
                )}
                <Button asChild className="mt-auto w-full" variant={course.myCompleted ? "outline" : "default"}>
                  <Link href={`/courses/${course.id}/learn`}>
                    {course.myCompleted ? (
                      <><CheckCircle2 className="h-4 w-4" /> Review Course</>
                    ) : course.myProgress != null ? (
                      <><Play className="h-4 w-4" /> Continue Learning</>
                    ) : (
                      <><Play className="h-4 w-4" /> Start Course</>
                    )}
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
