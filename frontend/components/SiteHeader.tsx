import Link from "next/link";
import { EDITION } from "@/config/editions";
import { AuthNav } from "./AuthNav";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="container-page relative flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2" aria-label={`${EDITION.name} home`}>
          <Logo />
          {EDITION.id === "lite" && (
            <span className="rounded-full bg-pitch-400/15 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider text-pitch-300">
              Lite
            </span>
          )}
        </Link>
        <AuthNav />
      </div>
    </header>
  );
}
