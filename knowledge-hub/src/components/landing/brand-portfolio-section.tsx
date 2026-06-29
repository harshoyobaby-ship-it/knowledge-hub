import { cn } from "@/lib/utils";
import {
  amoriteFutureCategories,
  portfolioBrands,
  type BrandProfile,
} from "@/lib/brand-data";

function CategoryList({
  title,
  items,
  variant = "default",
}: {
  title: string;
  items: string[];
  variant?: "default" | "future";
}) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              variant === "future"
                ? "border border-dashed border-primary/40 bg-primary/5 text-primary"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function BrandCard({ brand, index }: { brand: BrandProfile; index: number }) {
  const isAmorite = brand.id === "amorite";

  return (
    <article
      id={brand.id}
      className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className={cn("bg-gradient-to-r px-8 py-6 text-white", brand.accent)}>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
          Brand {index + 1}
        </p>
        <h3 className="mt-1 text-2xl font-bold tracking-tight">{brand.name}</h3>
        <p className="mt-2 text-sm text-white/90">{brand.positioning}</p>
      </div>

      <div className="space-y-6 p-8">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Vision</h4>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {brand.vision}
          </p>
        </div>

        <CategoryList title="Core Categories" items={brand.coreCategories} />
        <CategoryList title="Expansion Categories" items={brand.expansionCategories} />

        {isAmorite && (
          <CategoryList title="Future Categories" items={amoriteFutureCategories} variant="future" />
        )}

        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Benchmark Brands
          </h4>
          <p className="text-sm text-muted-foreground">
            {brand.benchmarkBrands.join(" · ")}
          </p>
        </div>

        {brand.strategicRule && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Strategic Rule
            </p>
            <p className="mt-2 text-sm text-amber-900 dark:text-amber-100">
              {brand.strategicRule}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

export function BrandPortfolioSection() {
  return (
    <section id="portfolio" className="bg-muted/30 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Portfolio
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Our Brand Ecosystem
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Seven distinct consumer brands under the KHARESIYA umbrella — each with clear
            category ownership, expansion roadmap, and competitive benchmarks.
          </p>
        </div>

        <div id="categories" className="grid gap-8 lg:grid-cols-2">
          {portfolioBrands.map((brand, index) => (
            <BrandCard key={brand.id} brand={brand} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
