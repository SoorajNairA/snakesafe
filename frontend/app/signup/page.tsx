import { SignupForm } from "@/components/auth/signup-form";
import Link from "next/link";
import { Shield } from "lucide-react";

export const metadata = {
  title: "Sign Up — SnakeSafe",
};

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-foreground hover:opacity-80 transition-opacity">
            <Shield className="w-6 h-6 text-primary" />
            SnakeSafe
          </Link>
          <p className="text-muted-foreground text-sm mt-2">Create your account</p>
        </div>
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
