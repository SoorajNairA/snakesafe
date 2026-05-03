"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShieldCheck, AlertTriangle, MapPin } from "lucide-react";
import { IdentifyClient } from "@/components/identify/identify-client";
import { DiagnoseClient } from "@/components/diagnose/diagnose-client";
import { EmergencyClient } from "@/components/emergency/emergency-client";
import { HospitalsClient } from "@/components/hospitals/hospitals-client";
import { cn } from "@/lib/utils";

const sections = [
  {
    key: "identify",
    label: "Identify",
    description: "Snake photo identification",
    icon: Search,
    render: () => <IdentifyClient />,
  },
  {
    key: "diagnose",
    label: "Diagnose",
    description: "Wound analysis",
    icon: ShieldCheck,
    render: () => <DiagnoseClient />,
  },
  {
    key: "emergency",
    label: "Emergency",
    description: "Rapid response",
    icon: AlertTriangle,
    render: () => <EmergencyClient />,
  },
  {
    key: "hospitals",
    label: "Hospitals",
    description: "Nearby care",
    icon: MapPin,
    render: () => <HospitalsClient />,
  },
] as const;

export function CommandCenter() {
  const [active, setActive] = useState<(typeof sections)[number]["key"]>("identify");

  const activeSection = sections.find((section) => section.key === active) ?? sections[0];

  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 pb-16 pt-20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
          animate={{ x: [0, 40, -10], y: [0, 20, 10] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "mirror" }}
        />
        <motion.div
          className="absolute top-24 right-0 h-48 w-48 rounded-full bg-accent/10 blur-3xl"
          animate={{ x: [0, -30, 10], y: [0, -20, 10] }}
          transition={{ duration: 14, repeat: Infinity, repeatType: "mirror" }}
        />
      </div>
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Control Deck</p>
        <h1 className="text-3xl md:text-4xl font-bold mt-2">SnakeSafe Action Center</h1>
        <p className="text-muted-foreground mt-2">
          Jump between tools instantly. Your selection appears below.
        </p>
      </div>

      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08 },
          },
        }}
      >
        {sections.map(({ key, label, description, icon: Icon }) => {
          const isActive = key === active;
          return (
            <motion.button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative w-full aspect-square rounded-2xl border text-left px-4 py-3 transition-all",
                isActive
                  ? "border-primary bg-primary/10 shadow-[0_12px_30px_oklch(0_0_0/0.25)]"
                  : "border-border bg-card/70 hover:border-primary/60 hover:bg-secondary"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="command-center-active"
                  className="absolute inset-0 rounded-2xl border border-primary/40 bg-primary/5"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
              <span className="relative z-10 flex flex-col gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-background/70 border border-border/60">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
                <span>
                  <span className="block font-semibold text-sm">{label}</span>
                  <span className="block text-xs text-muted-foreground">{description}</span>
                </span>
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      <div className="mt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-border/70 bg-card/60 p-4 md:p-6 shadow-[0_20px_50px_oklch(0_0_0/0.2)]"
          >
            {activeSection.render()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
