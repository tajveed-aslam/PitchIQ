"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, Repeat2, Send, Trash2, XCircle } from "lucide-react";
import { ReportView } from "@/components/main/ReportView";
import { ErrorNote, Loading, PageHeader, Panel, btnSm } from "@/components/main/ui";
import { api, STAGE_LABEL, thumbUrl, type Analysis, type AnalysisSummary } from "@/lib/api";
import { dueLabel, type OpenTask, type Overview } from "@/lib/main";

const STAGES = ["queued", "quality", "tracking", "counting"];

function HandIn({ analysis }: { analysis: Analysis }) {
  const [tasks, setTasks] = useState<OpenTask[] | null>(null);
  const [task, setTask] = useState<string>("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Overview>("/player/overview").then((o) => { setTasks(o.tasks); setTask(o.tasks[0] ? String(o.tasks[0].id) : ""); }).catch(() => setTasks([]));
  }, []);
  if (!tasks?.length) return null;
  async function send() {
    setState("busy");
    setError(null);
    try {
      await api(`/rooms/tasks/${task}/submit`, { method: "POST", json: { analysis_id: analysis.id } });
      setState("done");
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  }
  return (
    <Panel hud="Coach's task" title="Hand this video in" testId="hand-in">
      {state === "done" ? (
        <p className="flex items-center gap-2 text-good"><Check className="h-4 w-4" aria-hidden="true" /> Handed in. Your coach will score it.</p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <select value={task} onChange={(e) => setTask(e.target.value)} className="m-input sm:flex-1" aria-label="Task" data-testid="hand-in-task">
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.title} · {t.room} · {dueLabel(t.due_at)}</option>)}
          </select>
          <button type="button" onClick={send} disabled={state === "busy"} className="btn-primary" data-testid="hand-in-submit">
            {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />} Hand in
          </button>
        </div>
      )}
      <ErrorNote message={error} />
    </Panel>
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [a, setA] = useState<Analysis | null>(null);
  const [prev, setPrev] = useState<AnalysisSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const load = () =>
      api<Analysis>(`/analyses/${id}`).then((r) => {
        if (stopped) return;
        setA(r);
        if (r.status === "queued" || r.status === "processing") timer = setTimeout(load, 2500);
      }).catch((e) => setError(e.message));
    load();
    api<AnalysisSummary[]>("/analyses").then((all) => {
      const done = all.filter((x) => x.status === "done");
      const i = done.findIndex((x) => String(x.id) === id);
      if (i >= 0 && done[i + 1]) setPrev(done[i + 1]); // the list is newest first
    }).catch(() => undefined);
    return () => { stopped = true; clearTimeout(timer); };
  }, [id]);

  async function remove() {
    if (!a || !confirm(`Delete “${a.title}”? This can't be undone.`)) return;
    try {
      await api(`/analyses/${a.id}`, { method: "DELETE" });
      router.push("/reports");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error) return <><ErrorNote message={error} /><Link href="/reports" className="btn-secondary mt-6">Back to reports</Link></>;
  if (!a) return <Loading label="Loading the report" />;
  const pending = a.status === "queued" || a.status === "processing";
  const current = Math.max(0, STAGES.indexOf(a.stage));
  const thumb = thumbUrl(a);

  return (
    <>
      <PageHeader eyebrow={`Single skill · juggling · ${new Date(a.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`} title={a.title}
        action={<div className="flex flex-wrap gap-2">
          <Link href="/reports" className={btnSm}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Reports</Link>
          {prev && a.status === "done" && <Link href={`/compare?a=${prev.id}&b=${a.id}`} className={btnSm} data-testid="compare-previous"><Repeat2 className="h-4 w-4" aria-hidden="true" /> vs previous</Link>}
          {!pending && <button type="button" onClick={remove} className={btnSm} aria-label="Delete report" data-testid="delete-report"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
        </div>} />

      {pending && (
        <Panel className="mx-auto max-w-xl" testId="report-pending">
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="mb-5 aspect-video w-full rounded-2xl object-cover opacity-60" />
          )}
          <p className="flex items-center gap-2 font-medium text-white" aria-live="polite"><Loader2 className="h-5 w-5 animate-spin text-accent-300" aria-hidden="true" /> Analysing your session…</p>
          <ol className="mt-5 space-y-3">
            {STAGES.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 text-sm ${i <= current ? "text-white" : "text-chalk/50"}`}>
                <span className={`h-2 w-2 rounded-full ${i < current ? "bg-good" : i === current ? "animate-pulse bg-accent-300" : "bg-white/15"}`} />
                {STAGE_LABEL[s]}
              </li>
            ))}
          </ol>
          <p className="mt-5 text-xs text-chalk/50">About 3 minutes for a 15-second clip on our free server. You can leave: you&apos;ll get a notification.</p>
        </Panel>
      )}
      {a.status === "failed" && (
        <Panel className="mx-auto max-w-xl" testId="report-failed">
          <p className="flex items-center gap-2 font-medium text-white"><XCircle className="h-5 w-5 text-flare" aria-hidden="true" /> This video couldn&apos;t be analysed</p>
          <p className="mt-2 text-chalk/75">{a.error}</p>
          <Link href="/upload" className="btn-primary mt-5">Try another video</Link>
        </Panel>
      )}
      {(a.status === "done" || a.status === "rejected") && a.report && (
        <div className="space-y-4">
          {a.status === "rejected" && (
            <Panel testId="report-rejected">
              <p className="text-white">The quality check couldn&apos;t trust this video, so there&apos;s no coaching and it didn&apos;t use your allowance.</p>
              <Link href="/upload" className="btn-primary mt-4">Upload a new video</Link>
            </Panel>
          )}
          {a.status === "done" && <HandIn analysis={a} />}
          <ReportView report={a.report} coaching={a.coaching} coachingLocked={a.coaching_locked} rejected={a.status === "rejected"} />
        </div>
      )}
    </>
  );
}
