import Link from "next/link";
import { GraduationCap, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0f1e]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-white">KHARESIYA</p>
            <p className="text-[10px] uppercase tracking-widest text-white/50">Knowledge Hub</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#vision" className="text-sm text-white/70 transition-colors hover:text-white">
            Brand Vision
          </a>
          <a href="#portfolio" className="text-sm text-white/70 transition-colors hover:text-white">
            Portfolio
          </a>
          <a href="#categories" className="text-sm text-white/70 transition-colors hover:text-white">
            Categories
          </a>
        </nav>
        <Button asChild size="sm" className="gap-2">
          <Link href="/login">
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>
        </Button>
      </div>
    </header>
  );
}
