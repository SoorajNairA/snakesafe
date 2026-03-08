"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Mail, Lock, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
  MultiFactorResolver,
  MultiFactorError,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";

type Step = "credentials" | "otp";

const AUTH_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Invalid email or password.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password.",
  "auth/too-many-requests": "Too many failed attempts. Try again later.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/invalid-verification-code": "Invalid code. Check your authenticator app.",
  "auth/code-expired": "Code expired. Please start over.",
  "auth/invalid-api-key": "Firebase is not configured. Add your real API key to .env.local.",
  "auth/network-request-failed": "Network error. Check your connection and ensure the emulator is running.",
};

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      router.push("/identify");
    } catch (err: unknown) {
      const firebaseErr = err as MultiFactorError;
      if (firebaseErr.code === "auth/multi-factor-auth-required") {
        // User has 2FA enrolled — switch to OTP step
        setResolver(getMultiFactorResolver(firebaseAuth, firebaseErr));
        setStep("otp");
      } else {
        setError(AUTH_ERRORS[firebaseErr.code] ?? "Sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolver || otp.length !== 6) return;
    setError("");
    setLoading(true);
    try {
      const totpHint = resolver.hints.find(
        (h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID
      );
      if (!totpHint) throw new Error("No TOTP factor enrolled.");
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, otp);
      await resolver.resolveSignIn(assertion);
      router.push("/identify");
    } catch (err: unknown) {
      const firebaseErr = err as MultiFactorError;
      setError(AUTH_ERRORS[firebaseErr.code] ?? "Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {step === "credentials" ? (
        <motion.form
          key="credentials"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleCredentials}
          className="space-y-4"
        >
          {error && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm">
              {error}
            </div>
          )}

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
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-1 focus:ring-ring transition-shadow"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-foreground">Password</label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-1 focus:ring-ring transition-shadow"
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

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11 transition-all hover:shadow-[0_0_20px_oklch(0.58_0.24_25/0.25)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </motion.form>
      ) : (
        <motion.form
          key="otp"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleOtp}
          className="space-y-5"
        >
          <div className="flex flex-col items-center gap-2 pb-1 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <p className="font-semibold text-foreground">Two-Factor Authentication</p>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11 transition-all hover:shadow-[0_0_20px_oklch(0.58_0.24_25/0.25)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Sign In"
            )}
          </Button>

          <button
            type="button"
            onClick={() => { setStep("credentials"); setOtp(""); setError(""); }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            ← Back to sign in
          </button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
