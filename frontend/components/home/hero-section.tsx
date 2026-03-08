"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Shield,
  Upload,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DemoState = "upload" | "analyzing" | "venomous" | "safe";

function AppPreview() {
  const [state, setState] = useState<DemoState>("upload");
  const [confidence, setConfidence] = useState(0);

  // Cycle: upload → analyzing → venomous → upload → analyzing → safe → repeat
  useEffect(() => {
    let canceled = false;
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    const run = async () => {
      while (!canceled) {
        setState("upload");    setConfidence(0);
        await delay(1400);
        if (canceled) break;
        setState("analyzing");
        await delay(2000);
        if (canceled) break;
        setState("venomous");
        await delay(3500);
        if (canceled) break;
        setState("upload");   setConfidence(0);
        await delay(1400);
        if (canceled) break;
        setState("analyzing");
        await delay(2000);
        if (canceled) break;
        setState("safe");
        await delay(3500);
      }
    };
    run();
    return () => { canceled = true; };
  }, []);

  // Animate confidence bar on result reveal
  useEffect(() => {
    if (state !== "venomous" && state !== "safe") return;
    const target = state === "venomous" ? 94 : 99;
    setConfidence(0);
    let cur = 0;
    const iv = setInterval(() => {
      cur = Math.min(cur + 2, target);
      setConfidence(cur);
      if (cur >= target) clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  }, [state]);

  const isResult = state === "venomous" || state === "safe";
  const isVenomous = state === "venomous";

  return (
    <motion.div
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className="relative w-full max-w-[340px] mx-auto"
    >
      {/* Dynamic ambient glow */}
      <motion.div
        animate={{
          opacity: isVenomous ? 0.4 : state === "safe" ? 0.35 : 0.12,
        }}
        transition={{ duration: 1 }}
        className={cn(
          "absolute -inset-6 rounded-3xl blur-3xl pointer-events-none",
          isVenomous ? "bg-primary" : state === "safe" ? "bg-accent" : "bg-white/10"
        )}
      />

      {/* Card */}
      <div className="relative rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-5 shadow-2xl">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">SnakeSafe AI</span>
          </div>
          <motion.span
            key={state}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "text-xs px-2.5 py-0.5 rounded-full font-medium border",
              state === "analyzing"
                ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/20"
                : isVenomous
                ? "bg-primary/10 text-primary border-primary/20"
                : state === "safe"
                ? "bg-accent/10 text-accent border-accent/20"
                : "bg-secondary text-muted-foreground border-border"
            )}
          >
            {state === "upload"
              ? "Ready"
              : state === "analyzing"
              ? "Analyzing…"
              : isVenomous
              ? "⚠ Venomous"
              : "✓ Safe"}
          </motion.span>
        </div>

        {/* Preview area */}
        <div className="h-40 mb-4">
          <AnimatePresence mode="wait">
            {state === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="h-full rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Drop a snake photo here</p>
              </motion.div>
            )}

            {state === "analyzing" && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="h-full rounded-xl bg-secondary flex flex-col items-center justify-center gap-3"
              >
                <div className="relative w-12 h-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary"
                  />
                  <Zap className="absolute inset-0 m-auto w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1.5 w-32">
                  {[100, 75, 50].map((w, i) => (
                    <motion.div
                      key={i}
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: `${w}%`, opacity: 1 }}
                      transition={{ delay: i * 0.15, duration: 0.4 }}
                      className="h-1.5 rounded-full bg-primary/20"
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Running neural analysis…</p>
              </motion.div>
            )}

            {isResult && (
              <motion.div
                key={state}
                initial={{ opacity: 0, scale: 0.93 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.93 }}
                transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
                className={cn(
                  "h-full rounded-xl p-4 flex flex-col justify-between border",
                  isVenomous
                    ? "bg-primary/10 border-primary/30"
                    : "bg-accent/10 border-accent/30"
                )}
              >
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-2"
                >
                  {isVenomous ? (
                    <ShieldAlert className="w-6 h-6 text-primary" />
                  ) : (
                    <ShieldCheck className="w-6 h-6 text-accent" />
                  )}
                  <span
                    className={cn(
                      "font-bold tracking-wide",
                      isVenomous ? "text-primary" : "text-accent"
                    )}
                  >
                    {isVenomous ? "VENOMOUS" : "NON-VENOMOUS"}
                  </span>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-semibold text-foreground">{confidence}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-none",
                        isVenomous ? "bg-primary" : "bg-accent"
                      )}
                      style={{ width: `${confidence}%`, transition: "width 18ms linear" }}
                    />
                  </div>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-xs text-muted-foreground italic"
                >
                  {isVenomous
                    ? "Banded Krait (Bungarus fasciatus)"
                    : "Common Rat Snake (Ptyas mucosa)"}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Accuracy", value: "89%" },
            { label: "Response", value: "<3s" },
            { label: "Uptime", value: "24/7" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-2 rounded-lg bg-secondary">
              <p className="text-xs font-bold text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-14 min-h-[calc(100vh-56px)] flex items-center">
      {/* Background glows */}
      <div className="pointer-events-none absolute top-10 left-1/4 w-[600px] h-[500px] opacity-20 blur-[130px] bg-[radial-gradient(ellipse,oklch(0.58_0.24_25/0.5)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 w-[400px] h-[400px] opacity-12 blur-[100px] bg-[radial-gradient(ellipse,oklch(0.60_0.18_155/0.4)_0%,transparent_70%)]" />

      <div className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-16 items-center w-full">
        {/* Left — text */}
        <div className="flex flex-col items-start gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium backdrop-blur-sm"
          >
            <Shield className="w-3.5 h-3.5" />
            Emergency-Ready Snake Identification
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight"
          >
            Identify Snakes.
            <br />
            <span className="text-gradient-primary">Save Lives.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-muted-foreground text-lg leading-relaxed max-w-lg"
          >
            Upload a photo to instantly identify venomous snakes, get first aid guidance,
            and locate the nearest hospital — all in seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Link href="/identify">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 transition-all duration-200 hover:shadow-[0_0_30px_oklch(0.58_0.24_25/0.35)]"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Identify a Snake Now
              </Button>
            </Link>
            <Link href="/first-aid">
              <Button
                variant="outline"
                size="lg"
                className="border-border text-foreground hover:bg-secondary font-medium px-6 transition-colors"
              >
                First Aid Guide
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Right — animated app preview */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        >
          <AppPreview />
        </motion.div>
      </div>
    </section>
  );
}
