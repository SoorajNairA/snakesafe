"use client";

import { useState } from "react";
import {
  AlertTriangle,
  MapPin,
  Loader2,
  CheckCircle,
  Clock,
  Truck,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";

type EmergencyStatus = "pending" | "dispatched" | "resolved";

type Emergency = {
  id: string;
  date: string;
  location: string;
  status: EmergencyStatus;
  description: string;
};

const mockHistory: Emergency[] = [
  {
    id: "EMG-001",
    date: "2025-12-14 10:32",
    location: "Sector 4, Bangalore",
    status: "resolved",
    description: "Cobra sighting near garden. Victim bitten on right hand.",
  },
  {
    id: "EMG-002",
    date: "2025-12-01 15:10",
    location: "Whitefield, Bangalore",
    status: "dispatched",
    description: "Russell's viper identified. Patient conscious and stable.",
  },
];

const statusConfig: Record<EmergencyStatus, { label: string; color: string; Icon: React.ElementType }> = {
  pending: { label: "Pending", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", Icon: Clock },
  dispatched: { label: "Dispatched", color: "text-sky-400 bg-sky-400/10 border-sky-400/30", Icon: Truck },
  resolved: { label: "Resolved", color: "text-accent bg-accent/10 border-accent/30", Icon: CheckCircle },
};

export function EmergencyClient() {
  const [tab, setTab] = useState<"report" | "history">("report");
  const [description, setDescription] = useState("");
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Emergency | null>(null);

  const detectLocation = () => {
    setLocationDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setLocationDetecting(false);
      },
      () => {
        setLocation("Location unavailable");
        setLocationDetecting(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Mock API: POST /v1/emergency/send
    await new Promise((r) => setTimeout(r, 1800));
    setSubmitted({
      id: `EMG-${Math.floor(Math.random() * 900 + 100)}`,
      date: new Date().toLocaleString(),
      location: location || "Unknown location",
      status: "pending",
      description,
    });
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <FadeIn className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Emergency</h1>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Report a snakebite incident and track dispatch status in real time.
        </p>
      </FadeIn>

      {/* Tabs */}
      <FadeIn delay={0.1} className="mb-6">
        <div className="flex gap-1 p-1 rounded-lg bg-secondary w-fit relative">
          {(["report", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative z-10 px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors",
                tab === t
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === t && (
                <motion.span
                  layoutId="emergency-tab"
                  className="absolute inset-0 bg-background rounded-md shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                {t === "report" ? "Report Incident" : "History"}
              </span>
            </button>
          ))}
        </div>
      </FadeIn>

      {/* Report Form */}
      <AnimatePresence mode="wait">
        {tab === "report" && !submitted && (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Location
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter location or auto-detect"
                  className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-1 focus:ring-ring transition-shadow"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={detectLocation}
                  disabled={locationDetecting}
                  className="border-border text-foreground hover:bg-secondary whitespace-nowrap transition-colors"
                >
                  {locationDetecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4 mr-1" />
                  )}
                  {locationDetecting ? "Detecting..." : "Auto-Detect"}
                </Button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the incident: snake type if known, symptoms, victim condition..."
                rows={4}
                required
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-1 focus:ring-ring resize-none leading-relaxed transition-shadow"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting || !description.trim()}
              className={cn(
                "w-full bg-primary text-primary-foreground font-semibold h-11 transition-all duration-300",
                submitting
                  ? "animate-pulse-glow"
                  : "hover:bg-primary/90 hover:shadow-[0_0_25px_oklch(0.58_0.24_25/0.3)]"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting Emergency...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Report Emergency
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Emergency services will be notified immediately upon submission.
            </p>
          </motion.form>
        )}

        {/* Success state */}
        {tab === "report" && submitted && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
            className="rounded-xl border border-accent/40 bg-accent/10 p-6 space-y-4 shadow-[0_0_30px_oklch(0.60_0.18_155/0.1)]"
          >
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-3"
            >
              <CheckCircle className="w-8 h-8 text-accent" />
              <div>
                <p className="font-bold text-foreground text-lg">Emergency Reported</p>
                <p className="text-sm text-muted-foreground">ID: {submitted.id}</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="space-y-2 text-sm text-muted-foreground"
            >
              <p><span className="text-foreground font-medium">Location:</span> {submitted.location}</p>
              <p><span className="text-foreground font-medium">Status:</span> <span className="text-yellow-400">Pending dispatch</span></p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <Button
                variant="outline"
                className="border-border text-foreground hover:bg-secondary transition-colors"
                onClick={() => { setSubmitted(null); setDescription(""); setLocation(""); }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Report Another
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* History */}
        {tab === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {mockHistory.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">No emergency history found.</p>
            ) : (
              <StaggerContainer className="space-y-3">
                {mockHistory.map((em) => {
                  const { label, color, Icon } = statusConfig[em.status];
                  return (
                    <StaggerItem key={em.id}>
                      <div className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-border/80 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-foreground text-sm">{em.id}</p>
                            <p className="text-xs text-muted-foreground">{em.date}</p>
                          </div>
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium", color)}>
                            <Icon className="w-3 h-3" />
                            {label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {em.location}
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">{em.description}</p>
                      </div>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
