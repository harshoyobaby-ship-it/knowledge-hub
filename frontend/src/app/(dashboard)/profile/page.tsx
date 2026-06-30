"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { demoUser } from "@/lib/demo-data";
import { getInitials } from "@/lib/utils";
import { ROLE_LABELS } from "@/types";

export default function ProfilePage() {
  const user = demoUser;

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
            <h2 className="text-xl font-semibold">{user.firstName} {user.lastName}</h2>
            <p className="text-muted-foreground">{user.email}</p>
            <p className="mt-1 text-sm">{ROLE_LABELS[user.role]} · {user.department?.name}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Job Title</span><span>{user.jobTitle}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span>{user.department?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{user.email}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Learning Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Modules Completed</span><span>16/24</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Quizzes Passed</span><span>2/3</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SOPs Reviewed</span><span>8</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
