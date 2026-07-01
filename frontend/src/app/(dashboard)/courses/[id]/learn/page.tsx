"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Play,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

interface LessonResource {
  id: string;
  originalName: string;
  mimeType: string;
  url: string;
  resourceType: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  contentType: string;
  durationMinutes: number;
  order: number;
  resources: LessonResource[];
  progress: { completed: boolean }[];
}

interface Module {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface CourseDetail {
  id: string;
  title: string;
  description: string | null;
  enrolled: boolean;
  myProgress: number;
  modules: Module[];
  attachments?: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  }[];
}

async function fetchCourse(id: string): Promise<CourseDetail> {
  const res = await fetch(`/api/courses/${id}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

function ResourceViewer({ resource }: { resource: LessonResource }) {
  if (resource.resourceType === "VIDEO") {
    return (
      <video controls className="w-full rounded-lg bg-black" src={resource.url}>
        Your browser does not support video playback.
      </video>
    );
  }
  if (resource.resourceType === "PDF" || resource.mimeType === "application/pdf") {
    return (
      <iframe
        title={resource.originalName}
        src={resource.url}
        className="h-[60vh] w-full rounded-lg border"
      />
    );
  }
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border p-4 text-sm hover:bg-accent"
    >
      <FileText className="h-5 w-5" />
      Download {resource.originalName}
    </a>
  );
}

function LessonSidebar({
  course,
  activeLessonId,
  onSelect,
}: {
  course: CourseDetail;
  activeLessonId: string | null;
  onSelect: (lessonId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">{course.title}</p>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{course.myProgress}%</span>
          </div>
          <Progress value={course.myProgress} />
        </div>
      </div>
      {course.modules.map((mod) => (
        <div key={mod.id}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {mod.title}
          </p>
          <div className="space-y-1">
            {mod.lessons.map((lesson) => {
              const done = lesson.progress[0]?.completed;
              const active = lesson.id === activeLessonId;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => onSelect(lesson.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : lesson.contentType === "VIDEO" ? (
                    <Video className="h-4 w-4 shrink-0 opacity-70" />
                  ) : (
                    <Play className="h-4 w-4 shrink-0 opacity-70" />
                  )}
                  <span className="line-clamp-2">{lesson.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CourseLearnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const { data: course, isLoading, error, refetch } = useQuery({
    queryKey: ["course", id],
    queryFn: () => fetchCourse(id),
  });

  const allLessons = useMemo(
    () => course?.modules.flatMap((m) => m.lessons) ?? [],
    [course]
  );

  useEffect(() => {
    if (course && !activeLessonId && allLessons.length > 0) {
      const firstIncomplete = allLessons.find((l) => !l.progress[0]?.completed);
      setActiveLessonId(firstIncomplete?.id ?? allLessons[0].id);
    }
  }, [course, allLessons, activeLessonId]);

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/courses/${id}/enroll`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success("Enrolled! Start learning at your own pace.");
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setEnrolling(false),
  });

  const completeMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const lesson = allLessons.find((l) => l.id === lessonId);
      const res = await fetch(`/api/courses/lessons/${lessonId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeSpentMinutes: lesson?.durationMinutes ?? 0 }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success("Lesson completed!");
      queryClient.invalidateQueries({ queryKey: ["course", id] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeLesson = allLessons.find((l) => l.id === activeLessonId);
  const activeIndex = allLessons.findIndex((l) => l.id === activeLessonId);

  if (isLoading) return <LoadingSkeleton rows={2} />;
  if (error || !course) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Course not found.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/courses">Back to courses</Link>
        </Button>
      </div>
    );
  }

  if (!course.enrolled) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-12 text-center">
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <p className="text-muted-foreground">{course.description}</p>
        <Button
          size="lg"
          disabled={enrolling || enrollMutation.isPending}
          onClick={() => {
            setEnrolling(true);
            enrollMutation.mutate();
          }}
        >
          {(enrolling || enrollMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
          Enroll & Start Learning
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Mobile lesson nav */}
      <div className="border-b p-3 lg:hidden">
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href="/courses"><ChevronLeft className="h-4 w-4" /> Courses</Link>
        </Button>
        <LessonSidebar
          course={course}
          activeLessonId={activeLessonId}
          onSelect={setActiveLessonId}
        />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r p-4 lg:block">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/courses"><ChevronLeft className="h-4 w-4" /> All courses</Link>
        </Button>
        <LessonSidebar
          course={course}
          activeLessonId={activeLessonId}
          onSelect={setActiveLessonId}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {course.attachments && course.attachments.length > 0 && (
          <Card className="mx-auto mb-6 max-w-3xl">
            <CardContent className="p-4">
              <h2 className="mb-3 font-semibold">Course materials</h2>
              <ul className="space-y-2">
                {course.attachments.map((file) => (
                  <li key={file.id}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-accent"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{file.originalName}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {activeLesson ? (
          <div className="mx-auto max-w-3xl space-y-6">
            <div>
              <p className="text-sm text-muted-foreground">
                Lesson {activeIndex + 1} of {allLessons.length}
              </p>
              <h1 className="text-2xl font-bold">{activeLesson.title}</h1>
              {activeLesson.description && (
                <p className="mt-2 text-muted-foreground">{activeLesson.description}</p>
              )}
            </div>

            {activeLesson.resources.map((r) => (
              <ResourceViewer key={r.id} resource={r} />
            ))}

            {activeLesson.content && (
              <Card>
                <CardContent
                  className="prose prose-sm dark:prose-invert max-w-none p-6"
                  dangerouslySetInnerHTML={{ __html: activeLesson.content }}
                />
              </Card>
            )}

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-between">
              <Button
                variant="outline"
                disabled={activeIndex <= 0}
                onClick={() => setActiveLessonId(allLessons[activeIndex - 1].id)}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              {!activeLesson.progress[0]?.completed ? (
                <Button
                  onClick={() => completeMutation.mutate(activeLesson.id)}
                  disabled={completeMutation.isPending}
                >
                  {completeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Mark Complete
                </Button>
              ) : (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Completed
                </span>
              )}
              <Button
                variant="outline"
                disabled={activeIndex >= allLessons.length - 1}
                onClick={() => setActiveLessonId(allLessons[activeIndex + 1].id)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Select a lesson to begin.</p>
        )}
      </main>
    </div>
  );
}
