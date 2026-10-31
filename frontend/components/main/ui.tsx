// Main (Global) edition building blocks: page header, panels, stat tiles, meters, rings and status bits.
// The look comes from app/globals.css (.glass, .hud, .figure) and the Main theme variables.
import Link from "next/link";
import { Loader2, Lock, type LucideIcon } from "lucide-react";

export function PageHeader({ eyebrow, title, sub, action }: {
  eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-rise">
      <div className="max-w-2xl">
        {eyebrow && <p className="hud text-accent-300">{eyebrow}</p>}
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">{title}</h1>
        {sub && <p className="mt-2 text-chalk/70">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

export function Panel({ title, hud, action, className = "", children, id, testId }: {
  title?: React.ReactNode; hud?: string; action?: React.ReactNode; className?: string; children: React.ReactNode;
  id?: string; testId?: string;
}) {
  return (
    <section id={id} className={`glass p-5 sm:p-6 ${className}`} data-testid={testId}>
      {(title || hud || action) && (
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            {hud && <p className="hud">{hud}</p>}
            {title && <h2 className="mt-1 font-display text-lg font-semibold text-white">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Stat tile: label, value, optional signed delta (coloured by whether up is good, always with a sign). */
export function Stat({ label, value, unit, delta, upIsGood = true, hint, testId }: {
  label: string; value: React.ReactNode; unit?: string; delta?: number | null; upIsGood?: boolean; hint?: string; testId?: string;
}) {
  const good = delta != null && delta !== 0 && (delta > 0) === upIsGood;
  return (
    <div className="glass p-5" data-testid={testId}>
      <p className="hud">{label}</p>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="figure text-4xl">{value ?? "–"}</span>
        {unit && <span className="text-sm text-chalk/60">{unit}</span>}
      </p>
      {delta != null && delta !== 0 ? (
        <p className={`mt-1 text-sm ${good ? "text-good" : "text-flare"}`}>
          {delta > 0 ? "▲ +" : "▼ "}{Math.round(delta * 10) / 10} <span className="text-chalk/60">{hint ?? "vs before"}</span>
        </p>
      ) : hint ? <p className="mt-1 text-sm text-chalk/60">{hint}</p> : null}
    </div>
  );
}

/** Horizontal meter 0-100. Unmeasured values show an empty track and "not measured", never a guess. */
export function Meter({ label, value, sub }: { label: string; value: number | null; sub?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-chalk/85">{label}</span>
        <span className={value == null ? "text-xs text-chalk/50" : "font-mono font-medium text-white"}>{value ?? "not measured"}</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-accent-400/10">
        {value != null && <div className="h-1.5 rounded-full bg-gradient-to-r from-accent-500 to-accent-300" style={{ width: `${value}%` }} />}
      </div>
      {sub && <p className="mt-1 text-xs text-chalk/50">{sub}</p>}
    </div>
  );
}

/** Progress ring (SVG). */
export function Ring({ value, size = 120, stroke = 9, label, children }: {
  value: number; size?: number; stroke?: number; label: string; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(pct)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent-300))" />
            <stop offset="100%" stopColor="rgb(var(--glow))" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--accent-400) / .1)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring-grad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-chalk/70" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-accent-400" aria-hidden="true" /> {label}…
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-2xl border border-flare/30 bg-flare/10 px-4 py-3 text-sm text-flare" role="alert">{message}</p>;
}

export function Empty({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-300/20 to-glow/20">
        <Icon className="h-6 w-6 text-accent-300" aria-hidden="true" />
      </span>
      <p className="font-display text-lg font-semibold text-white">{title}</p>
      <p className="max-w-sm text-sm text-chalk/70">{text}</p>
      {action}
    </div>
  );
}

export function Locked({ title, text, testId }: { title: string; text: string; testId?: string }) {
  return (
    <div className="glass flex flex-col items-center gap-3 p-10 text-center" data-testid={testId}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-400/10"><Lock className="h-6 w-6 text-accent-300" aria-hidden="true" /></span>
      <p className="font-display text-xl font-semibold text-white">{title}</p>
      <p className="max-w-md text-chalk/70">{text}</p>
      <Link href="/settings#plan" className="btn-primary mt-2">See plans</Link>
    </div>
  );
}

export function Initials({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const letters = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const cls = size === "lg" ? "h-16 w-16 text-xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-300/25 to-glow/30 font-display font-semibold text-white ring-1 ring-white/10 ${cls}`} aria-hidden="true">
      {letters}
    </span>
  );
}

export const btnSm = "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50";
