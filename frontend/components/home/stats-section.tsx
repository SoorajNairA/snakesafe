"use client";

import { FadeIn, AnimatedCounter, StaggerContainer, StaggerItem } from "@/components/motion";

const stats = [
  { value: 89, suffix: "%", label: "Identification Accuracy" },
  { value: 3, prefix: "< ", suffix: "s", label: "Average Response Time" },
  { value: 50, suffix: "km", label: "Hospital Search Radius" },
  { value: 24, suffix: "/7", label: "Always Available" },
];

export function StatsSection() {
  return (
    <section className="relative border-y border-border bg-card/40 py-14 px-4 overflow-hidden">
      {/* Subtle gradient accent */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.58_0.24_25/0.04)_0%,transparent_70%)]" />

      <StaggerContainer className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 relative">
        {stats.map(({ value, suffix, prefix, label }) => (
          <StaggerItem key={label} className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-gradient-primary">
              <AnimatedCounter value={value} suffix={suffix} prefix={prefix || ""} />
            </p>
            <p className="text-muted-foreground text-sm mt-1">{label}</p>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
