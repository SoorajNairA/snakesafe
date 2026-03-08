"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText,
  MapPin,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Navigation,
  ImagePlus,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";
import { firebaseAuth } from "@/lib/firebase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5001/snakebite-app/asia-south1/api/v1";

type GpsCoords = { latitude: number; longitude: number };

type ApiReport = {
  id: string;
  timestamp: string;
  location: GpsCoords | null;
  symptoms: string[];
  prediction_result: string | null;
  venom_risk: "high" | "low" | null;
  confidence_score: number | null;
  status: "pending_prediction" | "prediction_complete" | "prediction_failed";
  snake_image_url: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReportsClient() {
  const [tab, setTab] = useState<"submit" | "history">("submit");

  // ── submit form state ──
  const [description, setDescription] = useState("");
  const [gpsCoords, setGpsCoords] = useState<GpsCoords | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── history state ──
  const [historyReports, setHistoryReports] = useState<ApiReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const captureGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => {
        setGpsError("Could not get your location. Please enable location permissions.");
        setGpsLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gpsCoords) {
      setGpsError("Please capture your GPS location before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      const formData = new FormData();
      formData.append("symptoms", JSON.stringify([description.trim()]));
      formData.append("location", JSON.stringify(gpsCoords));
      if (reportFile) formData.append("snake_image", reportFile);

      const res = await fetch(`${API_URL}/report/create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to submit report.");

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setDescription("");
    setGpsCoords(null);
    setGpsError("");
    setReportFile(null);
    setSubmitError("");
  };

  // Fetch history whenever the history tab is shown
  useEffect(() => {
    if (tab !== "history") return;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      setHistoryError("");
      try {
        const token = await firebaseAuth.currentUser?.getIdToken();
        const res = await fetch(`${API_URL}/report/history?limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Failed to load history.");
        if (!cancelled) setHistoryReports(data.reports ?? []);
      } catch (err) {
        if (!cancelled)
          setHistoryError(err instanceof Error ? err.message : "Failed to load history.");
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <FadeIn className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-6 h-6 text-yellow-400" />
          <h1 className="text-3xl font-bold text-foreground">Incident Reports</h1>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Submit bite incident reports to help track regional snake activity and improve emergency response.
        </p>
      </FadeIn>

      {/* Tabs */}
      <FadeIn delay={0.1} className="mb-6">
        <div className="flex gap-1 p-1 rounded-lg bg-secondary w-fit relative">
          {(["submit", "history"] as const).map((t) => (
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
                  layoutId="reports-tab"
                  className="absolute inset-0 bg-background rounded-md shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                {t === "submit" ? "Submit Report" : "History"}
              </span>
            </button>
          ))}
        </div>
      </FadeIn>

      <AnimatePresence mode="wait">
        {/* Submit form */}
        {tab === "submit" && !submitted && (
          <motion.form
            key="report-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* GPS location */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Location <span className="text-primary">*</span>
              </label>
              {gpsCoords ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/30">
                  <MapPin className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-sm text-foreground">
                    {gpsCoords.latitude.toFixed(5)}, {gpsCoords.longitude.toFixed(5)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGpsCoords(null)}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-secondary transition-colors"
                  onClick={captureGps}
                  disabled={gpsLoading}
                >
                  {gpsLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Getting location...</>
                  ) : (
                    <><Navigation className="w-4 h-4 mr-2" />Use My Location</>
                  )}
                </Button>
              )}
              {gpsError && (
                <p className="mt-1.5 text-xs text-primary flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  {gpsError}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened: snake species if known, victim condition, actions taken..."
                rows={5}
                required
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-1 focus:ring-ring resize-none leading-relaxed transition-shadow"
              />
            </div>

            {/* Optional snake image */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Snake Photo{" "}
                <span className="text-muted-foreground font-normal">(optional — enables AI identification)</span>
              </label>
              {reportFile ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary border border-border">
                  <ImagePlus className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground flex-1 truncate">{reportFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setReportFile(null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-border text-muted-foreground hover:bg-secondary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="w-4 h-4 mr-2" />
                  Attach Photo
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setReportFile(f);
                }}
              />
            </div>

            {submitError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/20 border border-primary/30">
                <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{submitError}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || !description.trim()}
              className={cn(
                "w-full bg-yellow-500 text-black font-semibold h-11 transition-all duration-300",
                submitting ? "animate-pulse-glow" : "hover:bg-yellow-400 hover:shadow-[0_0_20px_oklch(0.75_0.18_75/0.3)]"
              )}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" />Submit Report</>
              )}
            </Button>
          </motion.form>
        )}

        {/* Success */}
        {tab === "submit" && submitted && (
          <motion.div
            key="report-success"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
            className="rounded-xl border border-accent/40 bg-accent/10 p-6 space-y-4 text-center shadow-[0_0_30px_oklch(0.60_0.18_155/0.1)]"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
            >
              <CheckCircle className="w-10 h-10 text-accent mx-auto" />
            </motion.div>
            <p className="font-bold text-foreground text-lg">Report Submitted</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Thank you for contributing. Your report helps improve response times and regional snake tracking.
              {reportFile && " AI analysis of your photo is running in the background."}
            </p>
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-secondary transition-colors"
              onClick={resetForm}
            >
              Submit Another
            </Button>
          </motion.div>
        )}

        {/* History */}
        {tab === "history" && (
          <motion.div
            key="report-history"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {historyLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {historyError && (
              <div className="flex items-start gap-2 p-4 rounded-xl bg-primary/10 border border-primary/30">
                <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{historyError}</p>
              </div>
            )}

            {!historyLoading && !historyError && historyReports.length === 0 && (
              <div className="text-center py-16">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground text-sm">No reports yet. Submit your first report above.</p>
              </div>
            )}

            {!historyLoading && historyReports.length > 0 && (
              <StaggerContainer className="space-y-3">
                {historyReports.map((r) => {
                  const isExpanded = expandedIds.has(r.id);
                  const isVenomous = r.venom_risk === "high";
                  const statusColor =
                    r.status === "prediction_complete"
                      ? "text-accent bg-accent/10 border-accent/30"
                      : r.status === "prediction_failed"
                      ? "text-primary bg-primary/10 border-primary/30"
                      : "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
                  const statusLabel =
                    r.status === "prediction_complete"
                      ? "Complete"
                      : r.status === "prediction_failed"
                      ? "Failed"
                      : "Processing";

                  return (
                    <StaggerItem key={r.id}>
                      <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-border/80 transition-colors">
                        <button
                          onClick={() => toggleExpand(r.id)}
                          className="w-full flex items-center justify-between p-5 text-left hover:bg-secondary/40 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-foreground text-sm font-mono">
                                #{r.id.slice(0, 8)}
                              </p>
                              <span
                                className={cn(
                                  "text-xs px-2 py-0.5 rounded-full border font-medium",
                                  statusColor
                                )}
                              >
                                {statusLabel}
                              </span>
                              {r.venom_risk && (
                                <span
                                  className={cn(
                                    "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium",
                                    isVenomous
                                      ? "text-primary bg-primary/10 border-primary/30"
                                      : "text-accent bg-accent/10 border-accent/30"
                                  )}
                                >
                                  {isVenomous ? (
                                    <ShieldAlert className="w-3 h-3" />
                                  ) : (
                                    <ShieldCheck className="w-3 h-3" />
                                  )}
                                  {isVenomous ? "Venomous" : "Non-venomous"}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3 shrink-0" />
                              {formatDate(r.timestamp)}
                              {r.location && (
                                <>
                                  <MapPin className="w-3 h-3 shrink-0 ml-1" />
                                  {r.location.latitude.toFixed(4)}, {r.location.longitude.toFixed(4)}
                                </>
                              )}
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 ml-3" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-3" />
                          )}
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 border-t border-border pt-4 space-y-3">
                                {r.prediction_result && (
                                  <p className="text-sm text-foreground">
                                    <span className="text-muted-foreground">Species: </span>
                                    {r.prediction_result}
                                    {r.confidence_score != null && (
                                      <span className="text-muted-foreground">
                                        {" "}({Math.round(r.confidence_score * 100)}% confidence)
                                      </span>
                                    )}
                                  </p>
                                )}
                                {r.symptoms?.length > 0 && (
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {r.symptoms.join(" ")}
                                  </p>
                                )}
                                {r.snake_image_url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={r.snake_image_url}
                                    alt="Snake photo"
                                    className="rounded-lg max-h-48 object-cover border border-border"
                                  />
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
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
