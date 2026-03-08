import { Navbar } from "@/components/navbar";
import { SettingsForm } from "@/components/auth/settings-form";
import { Footer } from "@/components/footer";
import { RequireAuth } from "@/components/require-auth";

export const metadata = {
  title: "Account Settings — SnakeSafe",
  description: "Manage your SnakeSafe account settings.",
};

export default function SettingsPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="pt-14 flex-1 flex items-start justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <SettingsForm />
          </div>
        </div>
        <Footer />
      </main>
    </RequireAuth>
  );
}
