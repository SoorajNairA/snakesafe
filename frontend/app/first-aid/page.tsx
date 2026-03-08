import { Navbar } from "@/components/navbar";
import { FirstAidGuide } from "@/components/first-aid/first-aid-guide";
import { Footer } from "@/components/footer";
import { RequireAuth } from "@/components/require-auth";

export const metadata = {
  title: "First Aid Guide — SnakeSafe",
  description: "Step-by-step snakebite first aid guidance for emergency response.",
};

export default function FirstAidPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="pt-14 flex-1">
          <FirstAidGuide />
        </div>
        <Footer />
      </main>
    </RequireAuth>
  );
}
