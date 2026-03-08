"use client";

import { Search, AlertTriangle, MapPin, BookOpen, FileText, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";
import { motion } from "framer-motion";

const features = [
  {
    icon: Search,
    title: "Snake Identification",
    description:
      "Upload or photograph a snake for instant AI-powered classification with venomous/non-venomous risk assessment.",
    href: "/identify",
    color: "text-primary",
    bg: "bg-primary/10",
    hoverBorder: "hover:border-primary/40",
    glow: "group-hover:shadow-[0_0_30px_oklch(0.58_0.24_25/0.1)]",
  },
  {
    icon: AlertTriangle,
    title: "Emergency Reporting",
    description:
      "Report snakebite incidents with GPS location, photos, and descriptions. Track dispatch and resolution status.",
    href: "/emergency",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    hoverBorder: "hover:border-orange-400/40",
    glow: "group-hover:shadow-[0_0_30px_oklch(0.75_0.18_55/0.1)]",
  },
  {
    icon: MapPin,
    title: "Hospital Finder",
    description:
      "Locate nearby hospitals with antivenom, sorted by distance. One-tap call and directions via Google Maps.",
    href: "/hospitals",
    color: "text-accent",
    bg: "bg-accent/10",
    hoverBorder: "hover:border-accent/40",
    glow: "group-hover:shadow-[0_0_30px_oklch(0.60_0.18_155/0.1)]",
  },
  {
    icon: BookOpen,
    title: "First Aid Guide",
    description:
      "Step-by-step emergency response instructions covering what to do and what to avoid after a snakebite.",
    href: "/first-aid",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    hoverBorder: "hover:border-sky-400/40",
    glow: "group-hover:shadow-[0_0_30px_oklch(0.60_0.18_240/0.1)]",
  },
  {
    icon: FileText,
    title: "Incident Reports",
    description:
      "Submit and review bite incident reports to help track regional snake activity and improve response times.",
    href: "/reports",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    hoverBorder: "hover:border-yellow-400/40",
    glow: "group-hover:shadow-[0_0_30px_oklch(0.80_0.18_85/0.1)]",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description:
      "Designed for speed and clarity under stress. High-contrast UI that works even when you're injured or panicked.",
    href: "/identify",
    color: "text-primary",
    bg: "bg-primary/10",
    hoverBorder: "hover:border-primary/40",
    glow: "group-hover:shadow-[0_0_30px_oklch(0.58_0.24_25/0.1)]",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 px-4 max-w-7xl mx-auto">
      <FadeIn className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
          Everything you need in an emergency
        </h2>
        <p className="text-muted-foreground mt-3 text-lg max-w-xl mx-auto text-balance leading-relaxed">
          A complete toolkit designed for speed and clarity when every second counts.
        </p>
      </FadeIn>

      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map(({ icon: Icon, title, description, href, color, bg, hoverBorder, glow }) => (
          <StaggerItem key={title}>
            <Link href={href}>
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "group flex flex-col gap-4 p-6 rounded-xl border border-border bg-card transition-all duration-300",
                  hoverBorder,
                  glow
                )}
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110", bg)}>
                  <Icon className={cn("w-5 h-5", color)} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
                </div>
              </motion.div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
