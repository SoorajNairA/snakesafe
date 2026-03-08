import Link from "next/link";
import { Shield } from "lucide-react";

const footerLinks = [
  {
    title: "Features",
    links: [
      { label: "Identify Snake", href: "/identify" },
      { label: "Emergency", href: "/emergency" },
      { label: "Hospital Finder", href: "/hospitals" },
      { label: "First Aid", href: "/first-aid" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Incident Reports", href: "/reports" },
      { label: "First Aid Guide", href: "/first-aid" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign In", href: "/login" },
      { label: "Sign Up", href: "/signup" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-lg text-foreground">
              <Shield className="w-5 h-5 text-primary" />
              SnakeSafe
            </Link>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed max-w-xs">
              AI-powered snake identification and emergency assistance. Every second counts.
            </p>
          </div>

          {/* Link columns */}
          {footerLinks.map(({ title, links }) => (
            <div key={title}>
              <h4 className="font-semibold text-foreground text-sm mb-3">{title}</h4>
              <ul className="space-y-2">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SnakeSafe. AI-powered guidance — not a substitute for professional medical advice.
          </p>
          <p className="text-xs text-muted-foreground">
            Built for emergencies. Always seek professional help for snakebites.
          </p>
        </div>
      </div>
    </footer>
  );
}
