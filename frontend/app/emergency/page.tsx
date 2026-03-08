import { Navbar } from "@/components/navbar";
import { EmergencyClient } from "@/components/emergency/emergency-client";
import { Footer } from "@/components/footer";
import { RequireAuth } from "@/components/require-auth";

export const metadata = {
  title: "Emergency — SnakeSafe",
  description: "Report a snakebite emergency and track its status.",
};

export default function EmergencyPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="pt-14 flex-1">
          <EmergencyClient />
        </div>
        <Footer />
      </main>
    </RequireAuth>
  );
}
