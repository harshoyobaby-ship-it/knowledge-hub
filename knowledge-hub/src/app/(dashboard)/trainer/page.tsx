"use client";

import Link from "next/link";
import { GraduationCap, Upload, ClipboardList, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const links = [
  { href: "/admin/courses", label: "Create Course", icon: GraduationCap },
  { href: "/admin/content", label: "Upload Content", icon: Upload },
  { href: "/admin/content", label: "Create Exams", icon: ClipboardList },
  { href: "/learning-modules", label: "Knowledge Base", icon: BookOpen },
];

export default function TrainerPanelPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Trainer Panel" description="Create courses, upload materials, and manage assessments" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Your Courses" value="—" icon={GraduationCap} description="Manage in Course Builder" />
        <StatCard title="Pending Reviews" value="—" icon={ClipboardList} description="Assignment grading" />
        <StatCard title="Live Sessions" value="—" icon={BookOpen} description="Coming soon" />
      </div>

      <Card>
        <CardHeader><CardTitle>Trainer Actions</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <Link key={link.label} href={link.href} className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent">
              <link.icon className="h-5 w-5 text-primary" />
              <span className="font-medium">{link.label}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
