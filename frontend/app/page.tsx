import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/home/hero-section";
import { FeaturesSection } from "@/components/home/features-section";
import { StatsSection } from "@/components/home/stats-section";
import { CtaSection } from "@/components/home/cta-section";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
