import Link from "next/link";
import { EDITION } from "@/config/editions";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-ink-950">
      <div className="container-page grid gap-8 py-10 text-sm text-chalk/60 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm">{EDITION.tagline}</p>
          <p>A portfolio project. Payments are in test mode; no real charges.</p>
        </div>
        <div className="space-y-2">
          <p className="font-display font-bold uppercase tracking-wider text-white">Product</p>
          <Link href="/samples" className="block hover:text-white">Sample videos</Link>
          <Link href="/#plans" className="block hover:text-white">Plans</Link>
          <Link href="/#tips" className="block hover:text-white">Filming tips</Link>
        </div>
        <div className="space-y-2">
          <p className="font-display font-bold uppercase tracking-wider text-white">Credits</p>
          <p>Videos and stills: Mixkit (Free License).</p>
          <p>Vision models: MediaPipe (Apache 2.0).</p>
        </div>
      </div>
    </footer>
  );
}
