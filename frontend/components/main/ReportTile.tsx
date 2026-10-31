import Link from "next/link";
import { AlertTriangle, Loader2, ScanLine, XCircle } from "lucide-react";
import { thumbUrl, type AnalysisSummary } from "@/lib/api";

export function StatusPill({ a }: { a: AnalysisSummary }) {
  if (a.status === "queued" || a.status === "processing")
    return <span className="chip !border-accent-400/30 !text-accent-200"><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Analysing</span>;
  if (a.status === "rejected") return <span className="chip !border-flare/30 !text-flare"><AlertTriangle className="h-3 w-3" aria-hidden="true" /> Re-film</span>;
  if (a.status === "failed") return <span className="chip !border-flare/30 !text-flare"><XCircle className="h-3 w-3" aria-hidden="true" /> Failed</span>;
  return null;
}

/** A report as a thumbnail card. `href` lets coaches link to a player's report inside their room; href={null}
 * renders it without a link (inside another control, e.g. picking reports to compare). */
export function ReportTile({ a, href, compact = false }: { a: AnalysisSummary; href?: string | null; compact?: boolean }) {
  const thumb = thumbUrl(a);
  const body = (
    <>
      <div className={`relative ${compact ? "aspect-[16/9]" : "aspect-video"} bg-ink-800`}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed API URL, not a static asset
          <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100" />
        ) : (
          <div className="flex h-full items-center justify-center"><ScanLine className="h-8 w-8 text-chalk/30" aria-hidden="true" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
          {a.status === "done" && a.touches != null ? (
            <p><span className="figure text-3xl">{a.touches}</span> <span className="text-xs text-chalk/70">touches</span></p>
          ) : <StatusPill a={a} />}
          {a.source === "sample" && <span className="chip !py-0.5 !text-[10px]">Sample</span>}
        </div>
      </div>
      <div className="px-3.5 py-3">
        <p className="truncate text-sm font-medium text-white">{a.title}</p>
        <p className="text-xs text-chalk/50">{new Date(a.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>
      </div>
    </>
  );
  const cls = "glass glass-hover group block overflow-hidden !rounded-2xl";
  return href === null
    ? <div className={cls} data-testid="report-tile">{body}</div>
    : <Link href={href ?? `/reports/${a.id}`} className={cls} data-testid="report-tile">{body}</Link>;
}
