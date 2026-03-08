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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5001/snakebite-app/asia-south1/api/v1";

type PredictionResult = {
  prediction: "venomous" | "non-venomous";
  confidence: number;
  species?: string;
};

export function IdentifyClient() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PredictionResult | null>(null);
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

  const handlePredict = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError("");
    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      const formData = new FormData();
      formData.append("snake_image", imageFile);

      const res = await fetch(`${API_URL}/predict/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message ?? "Prediction failed. Please try again.");
      }

      setResult({
        prediction: data.venom_risk === "high" ? "venomous" : "non-venomous",
        confidence: data.confidence_score,
        species: data.species,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Prediction failed. Please try again."
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
    setLoading(false);
    setError("");
  };

  const isVenomous = result?.prediction === "venomous";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <FadeIn className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Snake Identification</h1>
        <p className="text-muted-foreground mt-1 leading-relaxed">
          Upload or photograph a snake to get an instant venomous/non-venomous classification.
        </p>
      </FadeIn>

      {/* Upload zone */}
      <AnimatePresence mode="wait">
        {!imageUrl && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-4 transition-all duration-300 cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/10 shadow-[0_0_30px_oklch(0.58_0.24_25/0.15)]"
                  : "border-border hover:border-primary/40 hover:bg-card"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <motion.div
                animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center"
              >
                <Upload className="w-7 h-7 text-muted-foreground" />
              </motion.div>
              <div className="text-center">
                <p className="font-medium text-foreground">Drag & drop an image here</p>
                <p className="text-muted-foreground text-sm mt-1">or click to browse · JPG, PNG supported</p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-foreground hover:bg-secondary transition-colors"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-foreground hover:bg-secondary transition-colors"
                  onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Use Camera
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image preview */}
      <AnimatePresence mode="wait">
        {imageUrl && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="relative rounded-xl overflow-hidden border border-border aspect-video bg-card">
              <Image
                src={imageUrl}
                alt="Uploaded snake image"
                fill
                className="object-contain"
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={reset}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                aria-label="Remove image"
              >
                <X className="w-4 h-4 text-foreground" />
              </motion.button>
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 rounded-lg bg-primary/20 border border-primary/30"
              >
                <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{error}</p>
              </motion.div>
            )}

            {/* Predict button */}
            {!result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  onClick={handlePredict}
                  disabled={loading}
                  className={cn(
                    "w-full bg-primary text-primary-foreground font-semibold h-11 transition-all duration-300",
                    loading
                      ? "animate-pulse-glow"
                      : "hover:bg-primary/90 hover:shadow-[0_0_25px_oklch(0.58_0.24_25/0.3)]"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Identify Snake
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Result card */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
                  className={cn(
                    "rounded-xl border p-6 space-y-4",
                    isVenomous
                      ? "border-primary/50 bg-primary/10 shadow-[0_0_30px_oklch(0.58_0.24_25/0.1)]"
                      : "border-accent/50 bg-accent/10 shadow-[0_0_30px_oklch(0.60_0.18_155/0.1)]"
                  )}
                >
                  {/* Risk indicator */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center gap-3"
                  >
                    {isVenomous ? (
                      <ShieldAlert className="w-8 h-8 text-primary shrink-0" />
                    ) : (
                      <ShieldCheck className="w-8 h-8 text-accent shrink-0" />
                    )}
                    <div>
                      <p
                        className={cn(
                          "text-xl font-bold uppercase tracking-wide",
                          isVenomous ? "text-primary" : "text-accent"
                        )}
                      >
                        {isVenomous ? "Venomous" : "Non-Venomous"}
                      </p>
                      {result.species && (
                        <p className="text-sm text-muted-foreground">{result.species}</p>
                      )}
                    </div>
                  </motion.div>

                  {/* Confidence */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-semibold text-foreground">{Math.round(result.confidence * 100)}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round(result.confidence * 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
                        className={cn(
                          "h-full rounded-full",
                          isVenomous ? "bg-primary" : "bg-accent"
                        )}
                      />
                    </div>
                  </motion.div>

                  {/* Warning */}
                  {isVenomous && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                      className="flex items-start gap-2 p-3 rounded-lg bg-primary/20 border border-primary/30"
                    >
                      <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">Immediate action required.</span> Do not handle the snake. Seek medical attention immediately and call emergency services.
                      </p>
                    </motion.div>
                  )}

                  {/* Action buttons */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col sm:flex-row gap-2 pt-1"
                  >
                    {isVenomous && (
                      <Link href="/emergency" className="flex-1">
                        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all hover:shadow-[0_0_20px_oklch(0.58_0.24_25/0.25)]">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Report Emergency
                        </Button>
                      </Link>
                    )}
                    <Link href="/first-aid" className="flex-1">
                      <Button variant="outline" className="w-full border-border text-foreground hover:bg-secondary transition-colors">
                        View First Aid
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="flex-1 border-border text-foreground hover:bg-secondary transition-colors"
                      onClick={reset}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Identify Another
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disclaimer */}
      <FadeIn delay={0.3}>
        <p className="text-muted-foreground text-xs mt-6 leading-relaxed text-center">
          This tool provides AI-powered guidance only and should not replace professional medical advice. Always seek emergency care for suspected snakebites.
        </p>
      </FadeIn>
    </div>
  );
}
