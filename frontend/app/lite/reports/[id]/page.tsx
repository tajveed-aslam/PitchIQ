"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, Trash2, XCircle } from "lucide-react";
import { Loading, PageShell } from "@/components/app/Bits";
import { CoachingPanel } from "@/components/CoachingPanel";
import { ReportCard } from "@/components/ReportCard";
import { api, STAGE_LABEL, type Analysis } from "@/lib/api";
import { useRequireUser } from "@/lib/auth";

const STAGES = ["queued", "quality", "tracking", "counting"];

export default function ReportPage() {
  const { user } = useRequireUser();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [a, setA] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const load = () =>
      api<Analysis>(`/analyses/${id}`)
        .then((r) => {
          if (stopped) return;
          setA(r);
          if (r.status === "queued" || r.status === "processing") timer = setTimeout(load, 2500);
        })
        .catch((e) => setError(e.message));
    load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [user, id]);

  async function remove() {
    if (!a || !confirm(`Delete “${a.title}”? This can't be undone.`)) return;
    try {
      await api(`/analyses/${a.id}`, { method: "DELETE" });
      router.push("/reports");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error) return <PageShell title="Report"><p className="text-flare" role="alert">{error}</p><Link href="/reports" className="btn-secondary mt-6">Back to reports</Link></PageShell>;
  if (!user || !a) return <Loading label="Loading the report" />;

  const pending = a.status === "queued" || a.status === "processing";
  const current = Math.max(0, STAGES.indexOf(a.stage));
  return (
    <PageShell eyebrow={new Date(a.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })} title={a.title}
      action={<div className="flex gap-2">
        <Link href="/reports" className="btn-secondary !px-4"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Reports</Link>
        {!pending && <button type="button" onClick={remove} className="btn-secondary !px-4" aria-label="Delete report" data-testid="delete-report"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
      </div>}>
      {pending && (
        <div className="card mx-auto max-w-xl space-y-5 p-6" aria-live="polite" data-testid="report-pending">
          <p className="flex items-center gap-2 font-semibold text-white"><Loader2 className="h-5 w-5 animate-spin text-accent-400" aria-hidden="true" /> Analysing your session…</p>
          <ol className="space-y-3">
            {STAGES.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 text-sm ${i <= current ? "text-white" : "text-chalk/60"}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${i < current ? "bg-accent-400" : i === current ? "animate-pulse bg-accent-300" : "bg-ink-600"}`} />
                {STAGE_LABEL[s]}
              </li>
            ))}
          </ol>
          <p className="text-xs text-chalk/60">On the free server this takes a few minutes (about 3 for a 15-second clip). You can leave this page; the report will be in Reports and you&apos;ll get a notification.</p>
        </div>
      )}
      {a.status === "failed" && (
        <div className="card mx-auto max-w-xl space-y-4 p-6" data-testid="report-failed">
          <p className="flex items-center gap-2 font-semibold text-white"><XCircle className="h-5 w-5 text-flare" aria-hidden="true" /> This video couldn&apos;t be analysed</p>
          <p className="text-chalk/80">{a.error}</p>
          <Link href="/upload" className="btn-primary"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Upload another</Link>
        </div>
      )}
      {(a.status === "done" || a.status === "rejected") && a.report && (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <ReportCard report={a.report} />
          {a.status === "rejected" ? (
            <div className="card space-y-3 p-6" data-testid="report-rejected">
              <h2 className="font-display text-2xl font-bold uppercase text-white">Film it again</h2>
              <p className="text-chalk/80">The count above isn&apos;t reliable, so no coaching this time, and it didn&apos;t use up your allowance.</p>
              <Link href="/upload" className="btn-primary">Upload a new video</Link>
            </div>
          ) : (
            <CoachingPanel coaching={a.coaching} locked={a.coaching_locked} />
          )}
        </div>
      )}
    </PageShell>
  );
}
