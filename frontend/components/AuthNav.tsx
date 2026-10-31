"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, LogOut, Menu, UserRound, X } from "lucide-react";
import { useSession } from "@/lib/auth";
import { RegionSwitch } from "./RegionSwitch";

const APP_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/reports", label: "Reports" },
  { href: "/events", label: "Challenge" },
  { href: "/support", label: "Help" },
];

const SITE_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/samples", label: "Samples" },
  { href: "/#plans", label: "Plans" },
  { href: "/events", label: "Challenge" },
];

export function AuthNav() {
  const { user, loading, logout } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const links = user ? APP_LINKS : SITE_LINKS;

  return (
    <>
      <nav aria-label="Main" className="hidden items-center gap-6 text-sm font-medium text-chalk/80 md:flex">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="transition hover:text-white">
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <RegionSwitch className="hidden lg:flex" />
        {loading ? (
          <span className="h-9 w-24" />
        ) : user ? (
          <>
            <Link href="/profile" className="hidden items-center gap-2 rounded-full border border-white/15 py-1 pl-1 pr-3 text-sm text-white hover:border-accent-400 sm:flex" data-testid="nav-profile">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-400 font-display font-bold text-ink-950">
                {user.name.charAt(0).toUpperCase()}
              </span>
              {user.is_guest ? "Demo" : user.name.split(" ")[0]}
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="hidden rounded-full p-2 text-chalk/70 hover:text-white sm:block"
              aria-label="Log out"
              data-testid="logout"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hidden px-3 py-2 text-sm font-medium text-chalk/80 hover:text-white sm:block">
              Log in
            </Link>
            <Link href="/samples" className="btn-primary !px-4 !py-2 !text-sm">
              Try a sample
            </Link>
          </>
        )}
        <button type="button" className="rounded-full p-2 text-white md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu" data-testid="menu">
          {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>
      {open && (
        <div className="absolute inset-x-0 top-16 z-40 border-y border-white/10 bg-ink-900/95 backdrop-blur md:hidden">
          <nav aria-label="Mobile" className="container-page flex flex-col py-3">
            <RegionSwitch className="mb-2 w-fit" />
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-3 text-lg font-medium text-white">
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 py-3 text-lg text-white">
                  <UserRound className="h-5 w-5" aria-hidden="true" /> Profile & plan
                </Link>
                <button type="button" onClick={() => { logout(); setOpen(false); router.push("/"); }} className="flex items-center gap-2 py-3 text-left text-lg text-chalk/80">
                  <LogOut className="h-5 w-5" aria-hidden="true" /> Log out
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="flex items-center gap-2 py-3 text-lg text-white">
                <LayoutDashboard className="h-5 w-5" aria-hidden="true" /> Log in
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
