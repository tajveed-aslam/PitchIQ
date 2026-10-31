"use client";

// The signed-in Main (Global) app: a command-centre sidebar on desktop, a top bar + bottom tab bar on phones,
// notifications, and the AI assistant docked on every page (the brief: "always accessible on every page").
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell, BrainCircuit, CalendarCheck2, ChartLine, ClipboardList, Home, IdCard, LifeBuoy, LogOut, Menu, Repeat2,
  ScanLine, Settings, Trophy, Upload, Users, X, type LucideIcon,
} from "lucide-react";
import { RegionSwitch } from "@/components/RegionSwitch";
import { api, type Notification } from "@/lib/api";
import { useRequireUser } from "@/lib/auth";
import { ChatDock } from "./ChatDock";
import { MainLogo } from "./Site";
import { Initials, Loading } from "./ui";

interface NavItem { href: string; label: string; icon: LucideIcon }

const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Player", items: [
    { href: "/dashboard", label: "Command centre", icon: Home },
    { href: "/card", label: "Player card", icon: IdCard },
    { href: "/assess", label: "Tests", icon: BrainCircuit },
  ] },
  { group: "Analysis", items: [
    { href: "/upload", label: "Analyse a video", icon: Upload },
    { href: "/reports", label: "Reports", icon: ScanLine },
    { href: "/compare", label: "Compare", icon: Repeat2 },
    { href: "/progress", label: "Progress", icon: ChartLine },
  ] },
  { group: "Train & compete", items: [
    { href: "/training", label: "Training plan", icon: CalendarCheck2 },
    { href: "/challenges", label: "Challenges", icon: Trophy },
    { href: "/rooms", label: "Rooms", icon: Users },
  ] },
];
const TABS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/upload", label: "Analyse", icon: Upload },
  { href: "/card", label: "Card", icon: IdCard },
  { href: "/training", label: "Train", icon: ClipboardList },
];

function active(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    api<Notification[]>("/me/notifications").then(setItems).catch(() => setItems([]));
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);
  const unread = items?.filter((n) => !n.read).length ?? 0;
  async function toggle() {
    setOpen((o) => !o);
    if (!open && unread) {
      await api("/me/notifications/read", { method: "POST" }).catch(() => undefined);
      setItems((xs) => xs?.map((n) => ({ ...n, read: true })) ?? null);
    }
  }
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={toggle} className="relative rounded-xl p-2.5 text-chalk/80 hover:bg-white/5 hover:text-white"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} data-testid="bell">
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-400 px-1 text-[10px] font-bold text-ink-950">{unread}</span>}
      </button>
      {open && (
        <div className="glass absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] p-2" data-testid="notifications">
          <p className="hud px-3 py-2">Notifications</p>
          <ul className="max-h-96 overflow-auto">
            {items?.length ? items.slice(0, 12).map((n) => (
              <li key={n.id}>
                <Link href={n.link ?? "/dashboard"} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm text-chalk/90 hover:bg-white/5">
                  {n.text}
                  <span className="mt-0.5 block text-xs text-chalk/50">{new Date(n.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </Link>
              </li>
            )) : <li className="px-3 py-4 text-sm text-chalk/60">Nothing yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, allowance, logout } = useRequireUser();
  const pathname = usePathname();
  const router = useRouter();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [pathname]);

  if (!user) return <Loading label="Opening your command centre" />;

  function signOut() {
    logout();
    router.push("/");
  }

  const nav = (
    <nav aria-label="App" className="space-y-6">
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="hud mb-2 px-3 text-chalk/40">{g.group}</p>
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const on = active(pathname, i.href);
              return (
                <li key={i.href}>
                  <Link href={i.href} aria-current={on ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${on ? "bg-gradient-to-r from-accent-400/15 to-transparent text-white" : "text-chalk/70 hover:bg-white/5 hover:text-white"}`}>
                    <i.icon className={`h-[18px] w-[18px] ${on ? "text-accent-300" : "text-chalk/50 group-hover:text-chalk"}`} aria-hidden="true" />
                    {i.label}
                    {on && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-400" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="space-y-3 border-t border-white/[0.06] pt-4">
      <div className="flex items-center gap-3 px-1">
        <Initials name={user.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white" data-testid="user-name">{user.name}</p>
          <p className="truncate text-xs text-chalk/50">{allowance?.plan_name}{user.is_guest ? " · shared demo" : ""}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Link href="/settings" className="m-tab !px-3 !py-1.5" aria-current={active(pathname, "/settings") ? "page" : undefined}><Settings className="mr-1.5 inline h-4 w-4" aria-hidden="true" />Settings</Link>
        <Link href="/support" className="m-tab !px-3 !py-1.5"><LifeBuoy className="mr-1.5 inline h-4 w-4" aria-hidden="true" />Help</Link>
        <button type="button" onClick={signOut} className="m-tab !px-3 !py-1.5" data-testid="logout"><LogOut className="mr-1.5 inline h-4 w-4" aria-hidden="true" />Log out</button>
      </div>
      <RegionSwitch className="w-fit border-white/10" />
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col justify-between overflow-y-auto border-r border-white/[0.06] bg-ink-950/60 p-4 backdrop-blur-xl lg:flex">
        <div className="space-y-8">
          <Link href="/dashboard" className="block px-2 pt-1" aria-label="PitchIQ command centre"><MainLogo /></Link>
          {nav}
        </div>
        {account}
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/[0.06] bg-ink-950/70 px-4 backdrop-blur-xl sm:px-6">
          <Link href="/dashboard" className="lg:hidden" aria-label="PitchIQ command centre"><MainLogo /></Link>
          <p className="hud hidden lg:block">{allowance ? `${allowance.remaining} of ${allowance.limit} analyses left this ${allowance.period === "trial" ? "trial" : allowance.period === "today" ? "day" : "month"}` : ""}</p>
          <div className="flex items-center gap-1">
            <Link href="/upload" className="btn-primary hidden !px-4 !py-2 sm:inline-flex"><Upload className="h-4 w-4" aria-hidden="true" /> Analyse</Link>
            <NotificationBell />
          </div>
        </div>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:pb-16">{children}</main>
      </div>

      {/* Phones: bottom tabs + a "More" sheet with everything else */}
      <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-ink-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="grid grid-cols-5">
          {TABS.map((t) => {
            const on = active(pathname, t.href);
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={on ? "page" : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${on ? "text-accent-300" : "text-chalk/60"}`}>
                  <t.icon className="h-5 w-5" aria-hidden="true" />{t.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setMore(true)} className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] text-chalk/60" data-testid="more" aria-expanded={more}>
              <Menu className="h-5 w-5" aria-hidden="true" />More
            </button>
          </li>
        </ul>
      </nav>
      {more && (
        <div className="fixed inset-0 z-50 bg-ink-950/70 backdrop-blur-sm lg:hidden" onClick={() => setMore(false)}>
          <div role="dialog" aria-modal="true" aria-label="Menu" className="glass absolute inset-x-2 bottom-2 max-h-[85vh] space-y-6 overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <MainLogo />
              <button type="button" onClick={() => setMore(false)} className="rounded-xl p-2 text-white" aria-label="Close menu"><X className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            {nav}
            {account}
          </div>
        </div>
      )}
      <ChatDock />
    </div>
  );
}
