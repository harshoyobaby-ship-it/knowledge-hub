import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { kharesiyaParent } from "@/lib/brand-data";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-[#0a0f1e] px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            {kharesiyaParent.name}
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            {kharesiyaParent.positioning}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-white/70 sm:text-xl">
            {kharesiyaParent.vision}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button asChild size="lg" className="gap-2">
              <Link href="/login">
                Access Knowledge Hub
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <a href="#portfolio">Explore Our Brands</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
