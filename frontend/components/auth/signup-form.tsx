"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Mail, Lock, User, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/snakebite-app/asia-south1/api/v1";

const SIGNUP_ERRORS: Record<string, string> = {
  EMAIL_ALREADY_EXISTS: "An account with this email already exists.",
  WEAK_PASSWORD: "Password must be at least 6 characters.",
  VALIDATION_ERROR: "Please fill in all required fields.",
};

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(SIGNUP_ERRORS[data.error] ?? data.message ?? "Sign-up failed. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="rounded-xl border border-accent/40 bg-accent/10 p-6 text-center space-y-3 shadow-[0_0_30px_oklch(0.60_0.18_155/0.1)]"
      >
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 300 }}>
          <CheckCircle className="w-10 h-10 text-accent mx-auto" />
        </motion.div>
        <p className="font-bold text-foreground">Account created!</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === "true" ? (
            <>
              Account created. Running locally — no email is sent.
              Find the verification link in the{" "}
              <a
                href="http://localhost:4000/auth"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Firebase Emulator UI
              </a>
              , or just sign in directly.
            </>
          ) : (
            <>A verification email has been sent to <span className="text-foreground">{email}</span>. Please verify to continue.</>
          )}
        </p>
        <Button
          onClick={() => router.push("/login")}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all hover:shadow-[0_0_20px_oklch(0.58_0.24_25/0.25)]"
        >
          Go to Sign In
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {error && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirm password */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            required
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11 transition-all hover:shadow-[0_0_20px_oklch(0.58_0.24_25/0.25)]"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        By signing up you agree to our Terms of Service and Privacy Policy.
      </p>
    </motion.form>
  );
}
