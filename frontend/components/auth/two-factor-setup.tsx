"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, Check, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
  onAuthStateChanged,
  User,
  MultiFactorInfo,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import QRCode from "qrcode";

type SetupState = "loading" | "unauthenticated" | "idle" | "generating" | "qr-shown" | "verifying" | "success" | "disabling";

const MFA_ERRORS: Record<string, string> = {
  "auth/invalid-verification-code": "Invalid code. Check your authenticator app.",
  "auth/code-expired": "Code expired. Please generate a new secret.",
  "auth/requires-recent-login": "Session expired. Please sign in again to manage 2FA.",
  "auth/totp-challenge-timeout": "Code timed out. Please try a fresh code.",
};

export function TwoFactorSetup() {
  const router = useRouter();
  const [state, setState] = useState<SetupState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [enrolledFactor, setEnrolledFactor] = useState<MultiFactorInfo | null>(null);
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [secretKey, setSecretKey] = useState<string>("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      if (!u) {
        setState("unauthenticated");
        return;
      }
      setUser(u);
      const factors = multiFactor(u).enrolledFactors;
      const totp = factors.find((f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID) ?? null;
      setEnrolledFactor(totp);
      setState("idle");
    });
    return unsub;
  }, []);

  const startEnrollment = useCallback(async () => {
    if (!user) return;
    setState("generating");
    setError("");
    try {
      const session = await multiFactor(user).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      const otpauthUri = secret.generateQrCodeUrl(user.email ?? "user", "SnakeSafe");
      const dataUrl = await QRCode.toDataURL(otpauthUri, { width: 220, margin: 1 });
      setTotpSecret(secret);
      setSecretKey(secret.secretKey);
      setQrDataUrl(dataUrl);
      setState("qr-shown");
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string };
      setError(MFA_ERRORS[firebaseErr.code ?? ""] ?? "Could not start 2FA setup. Try signing in again.");
      setState("idle");
    }
  }, [user]);

  const verifyAndEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpSecret || otp.length !== 6) return;
    setError("");
    setState("verifying");
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, otp);
      await multiFactor(user!).enroll(assertion, "Authenticator App");
      const factors = multiFactor(user!).enrolledFactors;
      setEnrolledFactor(factors.find((f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID) ?? null);
      setState("success");
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string };
      setError(MFA_ERRORS[firebaseErr.code ?? ""] ?? "Verification failed. Check the code and try again.");
      setState("qr-shown");
    }
  };

  const disableTotp = async () => {
    if (!user || !enrolledFactor) return;
    setState("disabling");
    setError("");
    try {
      await multiFactor(user).unenroll(enrolledFactor);
      setEnrolledFactor(null);
      setState("idle");
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string };
      setError(MFA_ERRORS[firebaseErr.code ?? ""] ?? "Could not disable 2FA. Try signing in again.");
      setState("idle");
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (state === "unauthenticated") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-primary/30 bg-primary/10 p-6 text-center space-y-4"
      >
        <AlertTriangle className="w-8 h-8 text-primary mx-auto" />
        <p className="font-semibold text-foreground">Sign in required</p>
        <p className="text-sm text-muted-foreground">You must be signed in to manage two-factor authentication.</p>
        <Button onClick={() => router.push("/login")} className="bg-primary text-primary-foreground hover:bg-primary/90">
          Go to Sign In
        </Button>
      </motion.div>
    );
  }

  // ── Already enrolled — success banner ─────────────────────────────────────
  if (state === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-accent/40 bg-accent/10 p-6 text-center space-y-3"
      >
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 300 }}>
          <ShieldCheck className="w-10 h-10 text-accent mx-auto" />
        </motion.div>
        <p className="font-bold text-foreground">Two-factor authentication enabled!</p>
        <p className="text-sm text-muted-foreground">
          Your account is now protected. You&apos;ll be asked for a 6-digit code from your authenticator app each time you sign in.
        </p>
        <Button onClick={() => router.push("/identify")} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
          Continue to App
        </Button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {/* ── Idle / Status ── */}
      {(state === "idle" || state === "generating" || state === "disabling") && (
        <motion.div
          key="idle"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >
          {/* Status card */}
          <div className={`rounded-xl border p-5 flex items-start gap-4 ${
            enrolledFactor
              ? "border-accent/30 bg-accent/10"
              : "border-border bg-secondary/50"
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              enrolledFactor ? "bg-accent/20" : "bg-secondary"
            }`}>
              {enrolledFactor
                ? <ShieldCheck className="w-5 h-5 text-accent" />
                : <Shield className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                {enrolledFactor ? "2FA is active" : "2FA is not enabled"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {enrolledFactor
                  ? `Enrolled ${new Date(enrolledFactor.enrollmentTime).toLocaleDateString()}`
                  : "Add an extra layer of security to your account."}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm">
              {error}
            </div>
          )}

          {enrolledFactor ? (
            <Button
              variant="outline"
              onClick={disableTotp}
              disabled={state === "disabling"}
              className="w-full border-primary/30 text-primary hover:bg-primary/10 font-medium"
            >
              {state === "disabling" ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Disabling...</>
              ) : (
                <><ShieldOff className="w-4 h-4 mr-2" />Disable 2FA</>
              )}
            </Button>
          ) : (
            <Button
              onClick={startEnrollment}
              disabled={state === "generating"}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11 hover:shadow-[0_0_20px_oklch(0.58_0.24_25/0.25)] transition-all"
            >
              {state === "generating" ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating secret...</>
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-2" />Enable 2FA</>
              )}
            </Button>
          )}
        </motion.div>
      )}

      {/* ── QR code + verification ── */}
      {(state === "qr-shown" || state === "verifying") && (
        <motion.form
          key="qr"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          onSubmit={verifyAndEnroll}
          className="space-y-5"
        >
          <div className="text-center space-y-1">
            <p className="font-semibold text-foreground">Scan with your authenticator app</p>
            <p className="text-sm text-muted-foreground">
              Use Google Authenticator, Authy, or any TOTP app.
            </p>
          </div>

          {/* QR code */}
          {qrDataUrl && (
            <div className="flex justify-center">
              <div className="p-3 rounded-xl bg-white shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="TOTP QR Code" width={220} height={220} />
              </div>
            </div>
          )}

          {/* Manual secret */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 text-center">
              Can&apos;t scan? Enter this key manually:
            </p>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary border border-border font-mono text-xs text-foreground break-all">
              <span className="flex-1 select-all">{secretKey}</span>
              <button
                type="button"
                onClick={copySecret}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Copy secret"
              >
                {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm">
              {error}
            </div>
          )}

          {/* OTP input */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground text-center">
              Enter the 6-digit code to confirm
            </p>
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
          </div>

          <Button
            type="submit"
            disabled={state === "verifying" || otp.length !== 6}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11 hover:shadow-[0_0_20px_oklch(0.58_0.24_25/0.25)] transition-all"
          >
            {state === "verifying" ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>
            ) : (
              "Activate 2FA"
            )}
          </Button>

          <button
            type="button"
            onClick={() => { setState("idle"); setOtp(""); setError(""); }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            ← Cancel
          </button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
