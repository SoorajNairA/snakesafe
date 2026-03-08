import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import { Shield } from "lucide-react";

export const metadata = {
  title: "Sign In — SnakeSafe",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-foreground hover:opacity-80 transition-opacity">
            <Shield className="w-6 h-6 text-primary" />
            SnakeSafe
          </Link>
          <p className="text-muted-foreground text-sm mt-2">Sign in to your account</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground mt-6">
          {"Don't have an account? "}
          <Link href="/signup" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
