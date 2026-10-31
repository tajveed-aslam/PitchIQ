import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { STAGE_LABEL, thumbUrl, type AnalysisSummary, type Dashboard } from "@/lib/api";

export function PageShell({ eyebrow, title, action, children }: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page pb-20 pt-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="heading mt-1">{title}</h1>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-chalk/70" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-accent-400" aria-hidden="true" /> {label}…
    </div>
  );
}

const STATUS = {
  queued: { icon: Clock, text: "Waiting", cls: "text-chalk bg-white/10" },
  processing: { icon: Loader2, text: "Analysing", cls: "text-accent-200 bg-accent-400/15" },
  done: { icon: CheckCircle2, text: "Ready", cls: "text-accent-300 bg-accent-400/15" },
  rejected: { icon: AlertTriangle, text: "Re-film", cls: "text-flare bg-flare/15" },
  failed: { icon: XCircle, text: "Failed", cls: "text-flare bg-flare/15" },
};

export function StatusChip({ a }: { a: AnalysisSummary }) {
  const s = STATUS[a.status];
  const label = a.status === "processing" || a.status === "queued" ? STAGE_LABEL[a.stage] ?? s.text : s.text;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>
      <s.icon className={`h-3.5 w-3.5 ${a.status === "processing" ? "animate-spin" : ""}`} aria-hidden="true" /> {label}
    </span>
  );
}

export function ReportTile({ a }: { a: AnalysisSummary }) {
  const thumb = thumbUrl(a);
  return (
    <Link href={`/reports/${a.id}`} className="group card flex overflow-hidden transition hover:border-accent-400/50" data-testid="report-tile">
      <div className="relative w-28 shrink-0 bg-ink-700 sm:w-36">
        {thumb ? (
          // API-served thumbnail: plain img (next/image would need the API domain configured per deployment)
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Image src="/images/floodlights-sm.webp" alt="" fill sizes="144px" className="object-cover opacity-40" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{a.title}</p>
          <p className="text-xs text-chalk/60">{new Date(a.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <StatusChip a={a} />
          {a.status === "done" && a.touches != null && (
            <span className="font-display text-2xl font-extrabold text-white">
              {a.touches}<span className="ml-1 font-sans text-xs font-normal text-chalk/60">touches</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function PlayerCard({ data }: { data: Dashboard }) {
  const { user, card } = data;
  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-accent-400/30 p-6 shadow-glow" data-testid="player-card">
      <Image src="/images/floodlights-sm.webp" alt="" fill sizes="400px" className="-z-20 object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-950/60 via-ink-950/85 to-ink-950" />
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-6xl font-extrabold leading-none text-accent-400">{card.overall ?? "–"}</p>
          <p className="mt-1 font-display text-sm font-bold uppercase tracking-widest text-white">
            {user.position ? user.position.slice(0, 3).toUpperCase() : "PLR"}
          </p>
        </div>
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent-400/60 bg-ink-800 font-display text-3xl font-extrabold text-white">
          {user.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <p className="mt-6 font-display text-3xl font-extrabold uppercase text-white">{user.name}</p>
      <p className="text-sm text-chalk/70">
        {[user.age && `${user.age} yrs`, user.favourite_team, user.country].filter(Boolean).join(" · ") || "Add your details in Profile"}
      </p>
      <div className="mt-5 grid grid-cols-4 gap-2 border-t border-white/10 pt-4">
        {card.attributes.length ? card.attributes.map((a) => (
          <div key={a.key} className="text-center" title={a.label}>
            <p className="font-display text-2xl font-bold text-white">{a.value ?? "–"}</p>
            <p className="text-[11px] font-semibold tracking-wider text-chalk/60">{a.key}</p>
          </div>
        )) : <p className="col-span-4 text-sm text-chalk/60">Your ratings appear after your first analysis.</p>}
      </div>
    </div>
  );
}

/** Touches over time as a small line chart (plain SVG keeps the Lite bundle small). */
export function Sparkline({ points }: { points: { date: string; touches: number | null }[] }) {
  const pts = points.filter((p) => p.touches != null) as { date: string; touches: number }[];
  if (pts.length < 2) return <p className="text-sm text-chalk/60">Two or more sessions draw your progress line.</p>;
  const w = 320, h = 96, pad = 8;
  const max = Math.max(...pts.map((p) => p.touches)), min = Math.min(...pts.map((p) => p.touches));
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (pts.length - 1);
  const y = (v: number) => h - pad - ((v - min) * (h - 2 * pad)) / Math.max(1, max - min);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.touches).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" role="img" aria-label={`Touches went from ${pts[0].touches} to ${pts[pts.length - 1].touches} over ${pts.length} sessions`}>
      <path d={`${line} L${x(pts.length - 1)},${h} L${x(0)},${h} Z`} fill="rgb(var(--accent-400) / .12)" />
      <path d={line} fill="none" stroke="rgb(var(--accent-400))" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.touches)} r="3.5" fill="rgb(var(--ink-950))" stroke="rgb(var(--accent-400))" strokeWidth="2" />)}
    </svg>
  );
}
