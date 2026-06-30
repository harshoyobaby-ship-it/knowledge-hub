import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-accent">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold">Kharesiya Knowledge Hub</p>
            <p className="text-sm text-sidebar-foreground/60">Enterprise Learning Platform</p>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Learn faster.<br />Retain knowledge.<br />Grow together.
          </h2>
          <p className="mt-4 max-w-md text-sidebar-foreground/70">
            Access department-specific SOPs, learning modules, and quizzes — all in one place.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/40">
          © {new Date().getFullYear()} Kharesiya Knowledge Hub
        </p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <GraduationCap className="h-8 w-8 text-primary" />
          <span className="text-xl font-semibold">Kharesiya Knowledge Hub</span>
        </div>
        <div className="w-full max-w-md">{children}</div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            ← Back to KHARESIYA Brands
          </Link>
        </p>
      </div>
    </div>
  );
}
