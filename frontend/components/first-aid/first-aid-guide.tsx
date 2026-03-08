import { CheckCircle, XCircle, AlertTriangle, Heart, Truck, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";

const steps = [
  {
    step: 1,
    title: "Stay Calm & Keep Still",
    body: "Panic increases heart rate and speeds up venom absorption. Have the victim sit or lie down calmly. Immobilize the bitten limb below heart level.",
    icon: Heart,
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    step: 2,
    title: "Remove Constricting Items",
    body: "Remove rings, watches, bracelets, and tight clothing near the bite site immediately. Swelling can develop rapidly and cause constriction.",
    icon: Activity,
    color: "text-sky-400",
    bg: "bg-sky-400/10",
  },
  {
    step: 3,
    title: "Note the Snake's Appearance",
    body: "If safe to do so, photograph or memorize the snake's size, color, and markings. Do NOT attempt to capture or handle the snake.",
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
  {
    step: 4,
    title: "Call Emergency Services",
    body: "Call your local emergency number (112 or 911) immediately. Transport the victim to the nearest hospital with antivenom treatment.",
    icon: Truck,
    color: "text-primary",
    bg: "bg-primary/10",
  },
];

const dos = [
  "Keep the victim as still as possible",
  "Keep the bitten limb below heart level",
  "Clean the wound gently with soap and water",
  "Cover the bite loosely with a clean bandage",
  "Mark the edge of swelling with a pen every 15 minutes",
  "Seek emergency medical care immediately",
];

const donts = [
  "Cut or suck out the venom — this can cause infection",
  "Apply ice or cold packs to the bite area",
  "Apply a tourniquet unless medically trained",
  "Give the victim alcohol or medications",
  "Let the victim walk if avoidable",
  "Attempt to catch or kill the snake",
];

export function FirstAidGuide() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <FadeIn className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Heart className="w-6 h-6 text-accent" />
          <h1 className="text-3xl font-bold text-foreground">First Aid Guide</h1>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Follow these steps immediately after a snakebite. Every second matters.
        </p>
      </FadeIn>

      {/* Emergency banner */}
      <FadeIn delay={0.1} className="mb-8">
      <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/40 bg-primary/10">
        <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground text-sm">If you suspect a venomous bite</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Call emergency services immediately. Do not wait for symptoms to appear. Antivenom must be administered in a hospital.
          </p>
        </div>
      </div>
      </FadeIn>

      {/* Steps */}
      <section className="mb-10">
        <FadeIn delay={0.15}>
          <h2 className="text-xl font-bold text-foreground mb-4">Immediate Response Steps</h2>
        </FadeIn>
        <StaggerContainer className="space-y-3">
          {steps.map(({ step, title, body, icon: Icon, color, bg }) => (
            <StaggerItem key={step}>
            <div className="flex gap-4 p-5 rounded-xl border border-border bg-card hover:border-border/80 transition-colors">
              <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Step {step}</span>
                </div>
                <p className="font-semibold text-foreground mb-1">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* Do's and Don'ts */}
      <FadeIn delay={0.2}>
      <section className="mb-10 grid sm:grid-cols-2 gap-4">
        {/* Do's */}
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
          <h3 className="font-bold text-accent mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Do
          </h3>
          <ul className="space-y-2">
            {dos.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Don'ts */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <h3 className="font-bold text-primary mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Do Not
          </h3>
          <ul className="space-y-2">
            {donts.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <XCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
      </FadeIn>

      {/* CTA */}
      <FadeIn delay={0.25}>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/emergency" className="flex-1">
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all hover:shadow-[0_0_20px_oklch(0.58_0.24_25/0.25)]">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Report Emergency
          </Button>
        </Link>
        <Link href="/hospitals" className="flex-1">
          <Button variant="outline" className="w-full border-border text-foreground hover:bg-secondary transition-colors">
            Find Nearest Hospital
          </Button>
        </Link>
      </div>
      </FadeIn>
    </div>
  );
}
