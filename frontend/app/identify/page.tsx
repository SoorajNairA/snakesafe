import { Navbar } from "@/components/navbar";
import { IdentifyClient } from "@/components/identify/identify-client";
import { Footer } from "@/components/footer";
import { RequireAuth } from "@/components/require-auth";

export const metadata = {
  title: "Identify a Snake — SnakeSafe",
  description: "Upload a photo to instantly identify if a snake is venomous or non-venomous.",
};

export default function IdentifyPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="pt-14 flex-1">
          <IdentifyClient />
        </div>
        <Footer />
      </main>
    </RequireAuth>
  );
}
