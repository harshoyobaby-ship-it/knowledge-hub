import { Building2, Shield } from "lucide-react";
import { kharesiyaParent } from "@/lib/brand-data";

export function ParentBrandSection() {
  return (
    <section id="vision" className="border-b bg-background px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Parent Brand
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {kharesiyaParent.tagline}
          </h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="rounded-2xl border bg-card p-8 shadow-sm lg:col-span-2">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Positioning</h3>
            <p className="mt-2 text-lg font-medium text-primary">
              {kharesiyaParent.positioning}
            </p>
            <h3 className="mt-8 text-xl font-semibold">Vision</h3>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {kharesiyaParent.vision}
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-8 shadow-sm">
            <h3 className="text-xl font-semibold">Category Scope</h3>
            <ul className="mt-4 space-y-2">
              {kharesiyaParent.categoryScope.map((cat) => (
                <li
                  key={cat}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {cat}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex items-start gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-foreground">Strategic Rule</p>
            <p className="mt-1 text-muted-foreground">{kharesiyaParent.rule}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
