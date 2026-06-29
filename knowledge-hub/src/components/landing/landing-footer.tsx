import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingFooter() {
  return (
    <footer className="border-t bg-[#0a0f1e] px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:justify-between lg:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold">Kharesiya Knowledge Hub</p>
              <p className="text-sm text-white/50">
                Enterprise learning for all KHARESIYA brands
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <p className="text-sm text-white/70">
              Access department SOPs, onboarding modules, quizzes, and company knowledge —
              built for employees across every KHARESIYA venture.
            </p>
            <Button asChild className="mt-6 gap-2" size="lg">
              <Link href="/login">
                Sign In to Knowledge Hub
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 text-center text-xs text-white/40">
          <p>© {new Date().getFullYear()} KHARESIYA BRANDS. All rights reserved.</p>
          <p className="mt-1">A KHARESIYA BRAND — Corporate House of Brands</p>
        </div>
      </div>
    </footer>
  );
}
