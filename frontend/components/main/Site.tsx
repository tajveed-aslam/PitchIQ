"use client";

// Main (Global) public chrome: logo, floating glass navigation, footer. Lite keeps its own (components/SiteHeader).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { RegionSwitch } from "@/components/RegionSwitch";
import { useSession } from "@/lib/auth";

export function MainLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="34" height="34" viewBox="0 0 36 36" aria-hidden="true">
        <defs>
          <linearGradient id="mlogo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent-200))" />
            <stop offset="55%" stopColor="rgb(var(--accent-400))" />
            <stop offset="100%" stopColor="rgb(var(--glow))" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="34" height="34" rx="10" fill="url(#mlogo)" />
        {/* a tracking reticle around a ball: what the product does */}
        <circle cx="18" cy="18" r="5" fill="rgb(var(--ink-950))" />
        <path d="M8 13V8h5M23 8h5v5M28 23v5h-5M13 28H8v-5" fill="none" stroke="rgb(var(--ink-950))" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      {!compact && <span className="font-display text-xl font-semibold tracking-[-0.03em] text-white">Pitch<span className="text-gradient">IQ</span></span>}
    </span>
  );
}

const LINKS = [
  { href: "/#platform", label: "Platform" },
  { href: "/#coaches", label: "For coaches" },
  { href: "/samples", label: "Try a sample" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/support", label: "Help" },
];

export function SiteNav() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6">
      <div className={`mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl border px-3 transition sm:px-4 ${scrolled || open ? "border-white/10 bg-ink-900/80 shadow-2xl backdrop-blur-xl" : "border-transparent"}`}>
        <Link href="/" aria-label="PitchIQ home"><MainLogo /></Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => <Link key={l.href} href={l.href} className="m-tab">{l.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <RegionSwitch className="hidden border-white/10 bg-white/5 lg:flex" />
          {user ? (
            <Link href="/dashboard" className="btn-primary !px-4 !py-2" data-testid="open-app">Open app <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          ) : (
            <>
              <Link href="/login" className="m-tab hidden sm:inline-flex">Log in</Link>
              <Link href="/signup" className="btn-primary !px-4 !py-2">Start free</Link>
            </>
          )}
          <button type="button" className="rounded-xl p-2 text-white lg:hidden" onClick={() => setOpen((o) => !o)}
            aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} data-testid="menu">
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile" className="glass mx-auto mt-2 max-w-6xl space-y-1 p-3 lg:hidden">
          {LINKS.map((l) => <Link key={l.href} href={l.href} className="block rounded-xl px-3 py-3 text-white hover:bg-white/5">{l.label}</Link>)}
          {!user && <Link href="/login" className="block rounded-xl px-3 py-3 text-white hover:bg-white/5">Log in</Link>}
          <div className="px-3 pt-2"><RegionSwitch className="w-fit" /></div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 text-sm text-chalk/60 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <MainLogo />
          <p className="max-w-xs">Measured football skills, AI coaching and team tools. Every number on your card comes from a video or a test you took.</p>
          <p className="text-xs">A portfolio project. Payments are in test mode; nothing is charged.</p>
        </div>
        <div className="space-y-2">
          <p className="hud text-chalk/80">Players</p>
          <Link href="/samples" className="block hover:text-white">Sample analysis</Link>
          <Link href="/#platform" className="block hover:text-white">Player card</Link>
          <Link href="/#pricing" className="block hover:text-white">Pricing</Link>
        </div>
        <div className="space-y-2">
          <p className="hud text-chalk/80">Coaches</p>
          <Link href="/#coaches" className="block hover:text-white">Rooms and tasks</Link>
          <Link href="/login?as=coach" className="block hover:text-white">Demo coach</Link>
          <Link href="/support" className="block hover:text-white">Federation enquiries</Link>
        </div>
        <div className="space-y-2">
          <p className="hud text-chalk/80">Credits</p>
          <p>Videos and stills: Mixkit (Free License).</p>
          <p>Vision models: MediaPipe (Apache 2.0).</p>
        </div>
      </div>
    </footer>
  );
}
