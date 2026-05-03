import { Navbar } from "@/components/navbar";
import { CommandCenter } from "@/components/dashboard/command-center";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1">
        <CommandCenter />
      </div>
      <Footer />
    </main>
  );
}
