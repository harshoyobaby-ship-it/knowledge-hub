import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { ParentBrandSection } from "@/components/landing/parent-brand-section";
import { BrandPortfolioSection } from "@/components/landing/brand-portfolio-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <main>
        <LandingHero />
        <ParentBrandSection />
        <BrandPortfolioSection />
      </main>
      <LandingFooter />
    </div>
  );
}
