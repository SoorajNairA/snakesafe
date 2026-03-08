"use client";

import { useState } from "react";
import { User, Mail, Lock, ShieldCheck, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

export function SettingsForm() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseAuth.currentUser) return;
    setNameLoading(true);
    setNameError("");
    setNameSuccess(false);
    try {
      await updateProfile(firebaseAuth.currentUser, {
        displayName: displayName.trim() || null,
      });
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch {
      setNameError("Failed to update display name. Please try again.");
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetLoading(true);
    setResetError("");
    try {
      await sendPasswordResetEmail(firebaseAuth, user.email);
      setResetSent(true);
    } catch {
      setResetError("Failed to send reset email. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile and security preferences.</p>
      </div>

      {/* Profile info */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">Profile</h2>
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Email</label>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary border border-border">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground">{user?.email ?? "—"}</span>
          </div>
        </div>

        {/* Display name */}
        <form onSubmit={handleUpdateName} className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              maxLength={60}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-1 focus:ring-ring transition-shadow"
            />
          </div>

          <AnimatePresence>
            {nameError && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-primary flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {nameError}
              </motion.p>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            disabled={nameLoading}
            className={cn(
              "w-full bg-primary text-primary-foreground font-semibold h-9 text-sm transition-all duration-200",
              nameLoading ? "opacity-70" : "hover:bg-primary/90"
            )}
          >
            {nameLoading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Saving...</>
            ) : nameSuccess ? (
              <><CheckCircle className="w-3.5 h-3.5 mr-2" />Saved!</>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </div>

      {/* Security */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">Security</h2>
        </div>

        {/* Password reset */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Send a password reset link to <span className="text-foreground font-medium">{user?.email}</span>.
          </p>
          <AnimatePresence>
            {resetError && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-primary flex items-center gap-1 mb-2"
              >
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {resetError}
              </motion.p>
            )}
          </AnimatePresence>
          {resetSent ? (
            <div className="flex items-center gap-2 text-sm text-accent">
              <CheckCircle className="w-4 h-4" />
              Reset email sent. Check your inbox.
            </div>
          ) : (
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-secondary transition-colors text-sm"
              onClick={handlePasswordReset}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Sending...</>
              ) : (
                "Send Reset Email"
              )}
            </Button>
          )}
        </div>

        {/* 2FA link */}
        <div className="pt-2 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">
            Two-factor authentication adds an extra layer of security to your account.
          </p>
          <Link href="/2fa-setup">
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-secondary transition-colors text-sm"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Manage 2FA
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
