import Link from "next/link";
import { EDITION } from "@/config/editions";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/samples", label: "Samples" },
  { href: "/#plans", label: "Plans" },
];

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2" aria-label={`${EDITION.name} home`}>
          <Logo />
          {EDITION.id === "lite" && (
            <span className="rounded-full bg-pitch-400/15 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider text-pitch-300">
              Lite
            </span>
          )}
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-medium text-chalk/80 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden px-3 py-2 text-sm font-medium text-chalk/80 hover:text-white sm:block">
            Log in
          </Link>
          <Link href="/samples" className="btn-primary !px-4 !py-2 !text-sm">
            Try a sample
          </Link>
        </div>
      </div>
    </header>
  );
}
