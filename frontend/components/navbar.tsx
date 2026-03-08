"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  Search,
  AlertTriangle,
  MapPin,
  BookOpen,
  FileText,
  Menu,
  X,
  User,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/identify", label: "Identify", icon: Search },
  { href: "/emergency", label: "Emergency", icon: AlertTriangle },
  { href: "/hospitals", label: "Hospitals", icon: MapPin },
  { href: "/first-aid", label: "First Aid", icon: BookOpen },
  { href: "/reports", label: "Reports", icon: FileText },
];

function Avatar({ name, email }: { name: string | null; email: string | null }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : (email?.[0] ?? "?").toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xs select-none">
      {initials}
    </div>
  );
}

function ProfileDropdown({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    onClose();
    await logout();
    router.push("/");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
      className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
    >
      {/* User info header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar name={user?.displayName ?? null} email={user?.email ?? null} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {user?.displayName ?? "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="p-1.5">
        <Link
          href="/2fa-setup"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-accent" />
          Two-Factor Authentication
        </Link>
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
          Account Settings
        </Link>
      </div>

      <div className="p-1.5 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </motion.div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-[0_1px_20px_oklch(0_0_0/0.3)]"
          : "border-b border-transparent bg-background/40 backdrop-blur-md"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground group">
          <Shield className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110" />
          <span>Snake<span className="text-primary">Safe</span></span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                pathname === href
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {pathname === href && (
                <motion.span
                  layoutId="navbar-active"
                  className="absolute inset-0 rounded-lg bg-primary"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="w-4 h-4" />
                {label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Desktop right — auth */}
        <div className="hidden md:flex items-center gap-2">
          {!loading && (
            user ? (
              /* Profile avatar + dropdown */
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-secondary transition-colors"
                  aria-label="User menu"
                >
                  <Avatar name={user.displayName} email={user.email} />
                  <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", dropdownOpen && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {dropdownOpen && <ProfileDropdown onClose={() => setDropdownOpen(false)} />}
                </AnimatePresence>
              </div>
            ) : (
              /* Sign in / Sign up */
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground transition-colors">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
                    Sign Up
                  </Button>
                </Link>
              </>
            )
          )}
        </div>

        {/* Mobile hamburger */}
        <motion.button
          className="md:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          whileTap={{ scale: 0.9 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {mobileOpen ? (
              <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X className="w-6 h-6" />
              </motion.span>
            ) : (
              <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Menu className="w-6 h-6" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
            className="md:hidden overflow-hidden border-t border-border/60 bg-background/95 backdrop-blur-xl"
          >
            <nav className="flex flex-col gap-1 px-4 pb-4 pt-2">
              {navItems.map(({ href, label, icon: Icon }, i) => (
                <motion.div
                  key={href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                >
                  <Link
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      pathname === href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                </motion.div>
              ))}

              {/* Mobile auth section */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.2 }}
                className="mt-3 pt-3 border-t border-border"
              >
                {!loading && (
                  user ? (
                    <div className="space-y-1">
                      {/* User info */}
                      <div className="flex items-center gap-3 px-3 py-2 mb-1">
                        <Avatar name={user.displayName} email={user.email} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{user.displayName ?? "User"}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <Link href="/2fa-setup" onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors">
                        <ShieldCheck className="w-4 h-4 text-accent" /> Two-Factor Auth
                      </Link>
                      <Link href="/settings" onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors">
                        <Settings className="w-4 h-4 text-muted-foreground" /> Settings
                      </Link>
                      <MobileLogout onClose={() => setMobileOpen(false)} />
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Link href="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                        <Button variant="outline" size="sm" className="w-full border-border text-foreground hover:bg-secondary">Sign In</Button>
                      </Link>
                      <Link href="/signup" className="flex-1" onClick={() => setMobileOpen(false)}>
                        <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Sign Up</Button>
                      </Link>
                    </div>
                  )
                )}
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MobileLogout({ onClose }: { onClose: () => void }) {
  const { logout } = useAuth();
  const router = useRouter();
  return (
    <button
      onClick={async () => { onClose(); await logout(); router.push("/"); }}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors"
    >
      <LogOut className="w-4 h-4" /> Sign Out
    </button>
  );
}
