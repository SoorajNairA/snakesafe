import { Navbar } from "@/components/navbar";
import { HospitalsClient } from "@/components/hospitals/hospitals-client";
import { Footer } from "@/components/footer";
import { RequireAuth } from "@/components/require-auth";

export const metadata = {
  title: "Hospital Finder — SnakeSafe",
  description: "Find nearby hospitals with antivenom treatment facilities.",
};

export default function HospitalsPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="pt-14 flex-1">
          <HospitalsClient />
        </div>
        <Footer />
      </main>
    </RequireAuth>
  );
}
