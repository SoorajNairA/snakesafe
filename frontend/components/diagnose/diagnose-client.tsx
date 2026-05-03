"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Upload,
  Camera,
  X,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion";
import Link from "next/link";
import { firebaseAuth } from "@/lib/firebase";
import { getAnonId } from "@/lib/anon-id";
import { TokenLimitModal } from "@/components/token-limit-modal";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5001/snakebite-app/asia-south1/api/v1";

type DiagnosisResult = {
  diagnosis: "snakebite" | "not_snakebite";
  confidence: number;
  description?: string;
};

export function DiagnoseClient() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [tokenLimitOpen, setTokenLimitOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setImageFile(file);
    setResult(null);
    setError("");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDiagnose = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError("");
    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      const anonId = getAnonId();
      const formData = new FormData();
      formData.append("wound_image", imageFile);

      const headers: Record<string, string> = {
        "X-Anon-Id": anonId,
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/predict/wound/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error === "TOKEN_LIMIT_EXCEEDED") {
          setTokenLimitOpen(true);
          return;
        }
        throw new Error(data.message ?? "Analysis failed. Please try again.");
      }

      setResult({
        diagnosis: data.is_snakebite ? "snakebite" : "not_snakebite",
        confidence: data.confidence_score,
        description: data.description,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Analysis failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setImageFile(null);
    setResult(null);
    setError("");
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <TokenLimitModal open={tokenLimitOpen} onClose={() => setTokenLimitOpen(false)} />
      <FadeIn>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Upload Section */}
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Wound Analysis</h1>
              <p className="text-lg text-muted-foreground">
                Upload a photo of the wound to determine if it might be a snakebite.
              </p>
            </div>

            {/* Upload Zone */}
            {!imageUrl ? (
              <motion.div
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer",
                  isDragging
                    ? "border-primary bg-primary/5 scale-105"
                    : "border-muted-foreground/30 hover:border-primary/50"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />

                <div className="flex flex-col items-center gap-4">
                  <Upload className="w-12 h-12 text-muted-foreground" />
                  <div>
                    <p className="font-semibold mb-1">Drop image here</p>
                    <p className="text-sm text-muted-foreground">
                      or click buttons below
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative rounded-lg overflow-hidden bg-muted h-80"
              >
                <Image
                  src={imageUrl}
                  alt="Wound preview"
                  fill
                  className="object-contain"
                />
                <button
                  onClick={() => {
                    if (imageUrl) URL.revokeObjectURL(imageUrl);
                    setImageUrl(null);
                    setImageFile(null);
                  }}
                  className="absolute top-2 right-2 bg-destructive/90 hover:bg-destructive p-1 rounded-full"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/10 border border-destructive rounded-lg p-4 flex gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </motion.div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleDiagnose}
                disabled={!imageFile || loading}
                size="lg"
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Analyze Wound
                  </>
                )}
              </Button>
              {result && (
                <Button
                  onClick={reset}
                  variant="outline"
                  size="lg"
                  className="px-6"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Right: Results Section */}
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div className="bg-card border rounded-lg p-8">
                  <div className="flex items-start gap-4 mb-6">
                    {result.diagnosis === "snakebite" ? (
                      <ShieldAlert className="w-12 h-12 text-destructive flex-shrink-0" />
                    ) : (
                      <ShieldCheck className="w-12 h-12 text-green-600 flex-shrink-0" />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold mb-1">
                        {result.diagnosis === "snakebite"
                          ? "Possible Snakebite"
                          : "Likely Not a Snakebite"}
                      </h2>
                      <p className="text-muted-foreground">
                        Confidence:{" "}
                        <span className="font-semibold">
                          {(result.confidence * 100).toFixed(1)}%
                        </span>
                      </p>
                    </div>
                  </div>

                  {result.description && (
                    <p className="text-sm leading-relaxed text-muted-foreground mb-6">
                      {result.description}
                    </p>
                  )}

                  <div className="space-y-3">
                    {result.diagnosis === "snakebite" && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded p-4">
                        <p className="text-sm font-semibold text-destructive mb-2">
                          Recommended Actions:
                        </p>
                        <ul className="text-sm text-destructive/80 space-y-1 list-disc list-inside">
                          <li>Seek immediate medical attention</li>
                          <li>Apply first aid if available</li>
                          <li>
                            <Link
                              href="/hospitals"
                              className="underline hover:text-destructive"
                            >
                              Find nearby hospitals
                            </Link>
                          </li>
                        </ul>
                      </div>
                    )}

                    {result.diagnosis !== "snakebite" && (
                      <div className="bg-green-600/10 border border-green-600/30 rounded p-4">
                        <p className="text-sm font-semibold text-green-600 mb-2">
                          Note:
                        </p>
                        <p className="text-sm text-green-600/80">
                          While the wound does not appear to be a snakebite, always consult
                          a medical professional if you experience symptoms or have concerns.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="font-semibold mb-3">Next Steps</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>✓ Review the wound carefully</p>
                    <p>✓ Monitor for any changes</p>
                    <p>
                      ✓{" "}
                      <Link href="/identify" className="underline hover:text-foreground">
                        Identify the snake
                      </Link>{" "}
                      if you haven't already
                    </p>
                    <p>
                      ✓{" "}
                      <Link href="/reports" className="underline hover:text-foreground">
                        Report this incident
                      </Link>{" "}
                      to help improve our database
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div className="bg-card border rounded-lg p-8 sticky top-24">
                  <h3 className="text-xl font-semibold mb-4">How It Works</h3>
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <div>
                      <p className="font-semibold text-foreground mb-1">
                        1. Upload a Clear Photo
                      </p>
                      <p>
                        Take a clear, well-lit photo of the wound directly from above if
                        possible.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">
                        2. AI Analysis
                      </p>
                      <p>
                        Our machine learning model analyzes the wound characteristics to
                        assess the likelihood of a snakebite.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">
                        3. Get Results
                      </p>
                      <p>
                        Receive an assessment with confidence level and recommendations.
                      </p>
                    </div>
                    <div className="bg-yellow-600/10 border border-yellow-600/30 rounded p-3 mt-4">
                      <p className="text-xs text-yellow-600 font-semibold">
                        ⚠️ Important: This analysis is for reference only. Always consult a
                        medical professional for proper diagnosis and treatment.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </FadeIn>
    </div>
  );
}
