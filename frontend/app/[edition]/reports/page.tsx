"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CloudUpload } from "lucide-react";
import { Loading, PageShell, ReportTile } from "@/components/app/Bits";
import { api, type AnalysisSummary } from "@/lib/api";
import { useRequireUser } from "@/lib/auth";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "done", label: "Ready" },
  { id: "pending", label: "In progress" },
  { id: "problems", label: "Re-film / failed" },
] as const;

export default function ReportsPage() {
  const { user } = useRequireUser();
  const [rows, setRows] = useState<AnalysisSummary[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout>;
    const load = () =>
      api<AnalysisSummary[]>("/analyses")
        .then((r) => {
          setRows(r);
          if (r.some((a) => a.status === "queued" || a.status === "processing")) timer = setTimeout(load, 4000);
        })
        .catch((e) => setError(e.message));
    load();
    return () => clearTimeout(timer);
  }, [user]);

  if (!user || (!rows && !error)) return <Loading label="Loading your reports" />;
  const shown = (rows ?? []).filter((a) =>
    filter === "all" ? true : filter === "done" ? a.status === "done" :
      filter === "pending" ? a.status === "queued" || a.status === "processing" : a.status === "rejected" || a.status === "failed");

  return (
    <PageShell eyebrow="My videos" title="Reports" action={<Link href="/upload" className="btn-primary"><CloudUpload className="h-5 w-5" aria-hidden="true" /> Upload</Link>}>
      {error && <p className="text-flare">{error}</p>}
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter reports">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${filter === f.id ? "bg-accent-400 text-ink-950" : "bg-white/5 text-chalk hover:bg-white/10"}`}>
            {f.label}
          </button>
        ))}
      </div>
      {shown.length ? (
        <div className="grid gap-3 md:grid-cols-2">{shown.map((a) => <ReportTile key={a.id} a={a} />)}</div>
      ) : (
        <p className="card p-8 text-center text-chalk/70">Nothing here yet.</p>
      )}
    </PageShell>
  );
}
