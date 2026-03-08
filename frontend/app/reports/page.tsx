import { Navbar } from "@/components/navbar";
import { ReportsClient } from "@/components/reports/reports-client";
import { Footer } from "@/components/footer";
import { RequireAuth } from "@/components/require-auth";

export const metadata = {
  title: "Reports — SnakeSafe",
  description: "Submit and review snakebite incident reports.",
};

export default function ReportsPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="pt-14 flex-1">
          <ReportsClient />
        </div>
        <Footer />
      </main>
    </RequireAuth>
  );
}
