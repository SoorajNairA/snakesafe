"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";

const AUTH_ERRORS: Record<string, string> = {
  "auth/user-not-found": "No account found with this email.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/network-request-failed": "Network error. Check your connection.",
};

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
      setSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(AUTH_ERRORS[code] ?? "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!sent ? (
        <motion.form
          key="form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter your account email and we&apos;ll send you a link to reset your password.
          </p>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              autoComplete="email"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-1 focus:ring-ring transition-shadow"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 p-3 rounded-lg bg-primary/15 border border-primary/30"
              >
                <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-primary text-primary-foreground font-semibold h-11 transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_25px_oklch(0.58_0.24_25/0.3)] disabled:opacity-60"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </motion.form>
      ) : (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
          className="rounded-xl border border-accent/40 bg-accent/10 p-6 space-y-3 text-center shadow-[0_0_30px_oklch(0.60_0.18_155/0.1)]"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
          >
            <CheckCircle className="w-10 h-10 text-accent mx-auto" />
          </motion.div>
          <p className="font-bold text-foreground text-lg">Check your inbox</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            A password reset link has been sent to{" "}
            <span className="text-foreground font-medium">{email}</span>.
            Check your spam folder if you don&apos;t see it within a few minutes.
          </p>
          <Link href="/login">
            <Button
              variant="outline"
              className="w-full border-border text-foreground hover:bg-secondary transition-colors mt-2"
            >
              Back to Sign In
            </Button>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
