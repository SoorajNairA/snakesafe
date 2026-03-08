"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView, useSpring, useMotionValue, useTransform } from "framer-motion";

/* ── Fade-in from bottom (scroll-triggered) ─────────────────────────────── */
export function FadeIn({
  children,
  delay = 0,
  duration = 0.6,
  className = "",
  y = 30,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Stagger container ──────────────────────────────────────────────────── */
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] },
  },
};

export function StaggerContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      variants={staggerContainer}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

/* ── Animated counter (for stats) ───────────────────────────────────────── */
export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  duration = 1.5,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { duration: duration * 1000, bounce: 0 });
  const rounded = useTransform(springVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, value, motionVal]);

  useEffect(() => {
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return unsub;
  }, [rounded]);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/* ── Scale-in (pop) ─────────────────────────────────────────────────────── */
export function ScaleIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Glow card wrapper ──────────────────────────────────────────────────── */
export function GlowCard({
  children,
  className = "",
  glowColor = "var(--primary)",
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`group relative rounded-xl border border-border bg-card overflow-hidden transition-colors hover:border-[color-mix(in_oklch,${glowColor}_40%,transparent)] ${className}`}
      style={
        {
          "--glow": glowColor,
        } as React.CSSProperties
      }
    >
      {/* Subtle glow on hover */}
      <div className="pointer-events-none absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(400px_at_var(--mouse-x,50%)_var(--mouse-y,50%),var(--glow)_0%,transparent_70%)]" style={{ opacity: 0 }} />
      {children}
    </motion.div>
  );
}

/* ── Slide-in (left or right) ───────────────────────────────────────────── */
export function SlideIn({
  children,
  direction = "left",
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  direction?: "left" | "right";
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const x = direction === "left" ? -40 : 40;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
