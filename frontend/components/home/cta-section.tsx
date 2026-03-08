"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogIn } from "lucide-react";
import { FadeIn } from "@/components/motion";

export function CtaSection() {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Gradient background accent */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,oklch(0.58_0.24_25/0.06)_0%,transparent_60%)]" />

      <FadeIn className="max-w-2xl mx-auto text-center flex flex-col items-center gap-6 relative">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
          Be prepared before an emergency strikes
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed text-balance">
          Create a free account to save your location, access your emergency history, and get personalized first-aid reminders.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/signup">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 transition-all duration-200 hover:shadow-[0_0_25px_oklch(0.58_0.24_25/0.3)]">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Get Started Free
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="border-border text-foreground hover:bg-secondary px-8 transition-colors">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </Link>
        </div>
        <p className="text-muted-foreground text-sm">
          No account needed to identify snakes or view first aid guides.
        </p>
      </FadeIn>
    </section>
  );
}
