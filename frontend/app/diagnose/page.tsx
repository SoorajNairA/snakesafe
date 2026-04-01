import { Navbar } from "@/components/navbar";
import { DiagnoseClient } from "@/components/diagnose/diagnose-client";
import { Footer } from "@/components/footer";
import { RequireAuth } from "@/components/require-auth";

export const metadata = {
  title: "Diagnose Wound — SnakeSafe",
  description: "Analyze a wound photo to determine if it might be a snakebite.",
};

export default function DiagnosePage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="pt-14 flex-1">
          <DiagnoseClient />
        </div>
        <Footer />
      </main>
    </RequireAuth>
  );
}
