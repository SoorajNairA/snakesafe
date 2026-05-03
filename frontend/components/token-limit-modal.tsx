"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

type TokenLimitModalProps = {
  open: boolean;
  onClose: () => void;
};

export function TokenLimitModal({ open, onClose }: TokenLimitModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <h2 className="text-xl font-semibold">Free scans used up</h2>
            <p className="text-sm text-muted-foreground mt-2">
              You have used your 3 free scans. Create an account or sign in to continue.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link href="/signup" onClick={onClose}>
                <Button className="w-full">Create account</Button>
              </Link>
              <Link href="/login" onClick={onClose}>
                <Button variant="outline" className="w-full">Sign in</Button>
              </Link>
              <Button variant="ghost" className="w-full" onClick={onClose}>
                Not now
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
