"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useInsights } from "@/hooks/use-insights";
import { getInitials } from "@/lib/utils";
import { ROLE_LABELS } from "@/types";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const { data: insights } = useInsights();

  if (isLoading) return <LoadingSkeleton rows={4} />;

  if (!user) {
    return (
      <div className="space-y-4">
        <PageHeader title="Profile" description="Manage your account settings" />
        <p className="text-muted-foreground">Please log in to view your profile.</p>
        <Button asChild>
          <Link href="/login">Go to login</Link>
        </Button>
      </div>
    );
  }

  const departmentName = user.department?.name ?? "Not assigned";
  const jobTitle = user.jobTitle ?? "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your account settings"
        actions={
          <Button variant="outline" asChild>
            <Link href="/profile/change-password">Change Password</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary text-xl text-primary-foreground">
              {getInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-muted-foreground">{user.email}</p>
            <p className="mt-1 text-sm">
              {ROLE_LABELS[user.role]} · {departmentName}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Job Title</span>
              <span className="text-right">{jobTitle}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Department</span>
              <span className="text-right">{departmentName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="text-right">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Phone</span>
                <span className="text-right">{user.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Learning Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modules Completed</span>
              <span>
                {insights?.completedModules ?? 0}/{insights?.totalModules ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quizzes Passed</span>
              <span>
                {insights?.quizzesCompleted ?? 0}/{insights?.totalQuizzes ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SOPs Reviewed</span>
              <span>
                {insights?.sopsCompleted ?? 0}/{insights?.totalSOPs ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
