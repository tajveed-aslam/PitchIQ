import Link from "next/link";
import { EDITIONS, type Edition } from "@/config/editions";
import { AuthNav } from "./AuthNav";
import { Logo } from "./Logo";

/** Lite's header (the Global edition has its own: components/main/Site.tsx). */
export function SiteHeader({ edition }: { edition: Edition }) {
  const e = EDITIONS[edition];
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="container-page relative flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2" aria-label={`${e.name} home`}>
          <Logo />
          {e.badge && (
            <span className="rounded-full bg-accent-400/15 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider text-accent-300" data-testid="edition-badge">
              {e.badge}
            </span>
          )}
        </Link>
        <AuthNav />
      </div>
    </header>
  );
}
