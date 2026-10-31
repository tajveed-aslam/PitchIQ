"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Repeat2, Search, Upload, X } from "lucide-react";
import { ReportTile } from "@/components/main/ReportTile";
import { Empty, ErrorNote, Loading, PageHeader } from "@/components/main/ui";
import { api, type AnalysisSummary } from "@/lib/api";

type Sort = "new" | "old" | "touches";

export default function Reports() {
  const router = useRouter();
  const [all, setAll] = useState<AnalysisSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("new");
  const [status, setStatus] = useState<"all" | "done" | "rejected">("all");
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);

  useEffect(() => {
    api<AnalysisSummary[]>("/analyses").then(setAll).catch((e) => setError(e.message));
  }, []);

  const shown = useMemo(() => {
    if (!all) return [];
    const list = all.filter((a) => (status === "all" || a.status === status) && a.title.toLowerCase().includes(q.trim().toLowerCase()));
    return [...list].sort((a, b) => sort === "touches" ? (b.touches ?? -1) - (a.touches ?? -1)
      : sort === "old" ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at));
  }, [all, q, sort, status]);

  if (error) return <ErrorNote message={error} />;
  if (!all) return <Loading label="Loading your reports" />;

  function toggle(id: number) {
    setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : p.length < 2 ? [...p, id] : [p[1], id]);
  }

  return (
    <>
      <PageHeader eyebrow="Analysis" title="Reports" sub={`${all.length} report${all.length === 1 ? "" : "s"} · every one is a single-skill juggling analysis`}
        action={<div className="flex gap-2">
          <button type="button" onClick={() => { setPicking((p) => !p); setPicked([]); }} className="btn-secondary !py-2" aria-pressed={picking} data-testid="pick-compare">
            {picking ? <X className="h-4 w-4" aria-hidden="true" /> : <Repeat2 className="h-4 w-4" aria-hidden="true" />} {picking ? "Cancel" : "Compare two"}
          </button>
          <Link href="/upload" className="btn-primary !py-2"><Upload className="h-4 w-4" aria-hidden="true" /> New</Link>
        </div>} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search reports</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-chalk/40" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="m-input !pl-10" data-testid="report-search" />
        </label>
        <div className="flex rounded-full border border-white/10 p-1" role="tablist" aria-label="Status">
          {(["all", "done", "rejected"] as const).map((s) => (
            <button key={s} type="button" role="tab" aria-selected={status === s} onClick={() => setStatus(s)} className="m-tab !py-1.5 capitalize">{s === "done" ? "Accepted" : s === "rejected" ? "Re-film" : "All"}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-chalk/70">Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="m-input !w-auto !py-2" data-testid="report-sort">
            <option value="new">Newest</option><option value="old">Oldest</option><option value="touches">Most touches</option>
          </select>
        </label>
      </div>

      {picking && (
        <div className="glass sticky top-20 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 p-4" aria-live="polite">
          <p className="text-sm text-chalk/80">Pick two accepted reports to compare · <span className="font-mono text-white">{picked.length}/2</span></p>
          <button type="button" disabled={picked.length !== 2} onClick={() => router.push(`/compare?a=${picked[0]}&b=${picked[1]}`)} className="btn-primary !py-2 disabled:opacity-50" data-testid="go-compare">Compare</button>
        </div>
      )}

      {shown.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {shown.map((a) => picking ? (
            <button key={a.id} type="button" disabled={a.status !== "done"} onClick={() => toggle(a.id)} aria-pressed={picked.includes(a.id)}
              className={`relative rounded-2xl text-left ring-2 transition disabled:opacity-40 ${picked.includes(a.id) ? "ring-accent-400" : "ring-transparent"}`} data-testid="pick-tile">
              <ReportTile a={a} href={null} />
              {picked.includes(a.id) && <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent-400 font-mono text-sm font-bold text-ink-950">{picked.indexOf(a.id) + 1}</span>}
            </button>
          ) : <ReportTile key={a.id} a={a} />)}
        </div>
      ) : (
        <Empty icon={Upload} title={all.length ? "No reports match" : "No reports yet"} text={all.length ? "Try another search or filter." : "Analyse a juggling video, or try one of ours on the samples page."}
          action={!all.length ? <Link href="/upload" className="btn-primary">Analyse a video</Link> : undefined} />
      )}
    </>
  );
}
