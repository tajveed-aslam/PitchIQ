"use client";

// One sample clip: play it, run it through the analysis (stored result by default, live with
// NEXT_PUBLIC_SAMPLE_MODE=live, same contract as Lite's SampleCard), and compare with the hand count.
import { useRef, useState } from "react";
import { Download, Loader2, ScanSearch } from "lucide-react";
import { api, STAGE_LABEL, type Coaching } from "@/lib/api";
import type { Report, Sample } from "@/lib/samples";
import { ReportView } from "./ReportView";

const STAGES = ["queued", "quality", "tracking", "counting"];
const LIVE = process.env.NEXT_PUBLIC_SAMPLE_MODE === "live";

interface Job { status: "queued" | "processing" | "done" | "failed"; stage: string; report: Report | null; coaching: Coaching | null; error?: string | null }

export function SampleRunner({ sample, index }: { sample: Sample; index: number }) {
  const [stage, setStage] = useState<string | null>(null);
  const [result, setResult] = useState<{ report: Report; coaching: Coaching | null; note: string } | null>(null);
  const stop = useRef(false);

  async function stored(note = "Pre-computed by the same analysis on this exact file; a live run takes a few minutes on our free server.") {
    for (const s of STAGES) {
      setStage(s);
      await new Promise((r) => setTimeout(r, 450));
    }
    const coaching = await api<{ coaching: Coaching | null }>(`/samples/${sample.id}/coaching`).then((r) => r.coaching).catch(() => null);
    setStage(null);
    setResult({ report: sample.report, coaching, note });
  }

  async function run() {
    setResult(null);
    setStage("queued");
    stop.current = false;
    if (!LIVE) return stored();
    try {
      const { job_id } = await api<{ job_id: string }>(`/samples/${sample.id}/analyse`, { method: "POST" });
      const started = Date.now();
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        if (stop.current) return;
        const j = await api<Job>(`/samples/jobs/${job_id}`);
        if (j.status === "done" && j.report) { setStage(null); return setResult({ report: j.report, coaching: j.coaching, note: "Live result: analysed just now on the server." }); }
        if (j.status === "failed" || Date.now() - started > 180_000) return stored("The live run didn't finish, so this is the stored result from the same pipeline.");
        setStage(j.stage);
      }
    } catch (e) {
      stored(`${(e as Error).message} Showing the stored result from the same pipeline.`);
    }
  }

  const current = stage ? Math.max(0, STAGES.indexOf(stage)) : 0;
  return (
    <article id={sample.id} className="scroll-mt-24 space-y-4" data-testid={`sample-${sample.id}`}>
      <div className="grid items-center gap-6 lg:grid-cols-[1.1fr_1fr]">
        <video controls preload="none" playsInline poster={sample.poster} className="aspect-video w-full rounded-3xl border border-white/[0.08] bg-black object-cover" aria-label={`Sample video: ${sample.title}`}>
          <source src={sample.video} type="video/mp4" />
        </video>
        <div className="space-y-4">
          <p className="hud">Sample {String(index + 1).padStart(2, "0")} · {sample.level}</p>
          <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-white">{sample.title}</h2>
          <p className="text-chalk/70">{sample.blurb}</p>
          <p className="text-sm text-chalk/60">Hand count: <span className="font-mono text-white">{sample.ground_truth.touches ?? "–"}</span> · {sample.report.video.duration_s.toFixed(0)} s · Video: {sample.credit}</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={run} disabled={stage !== null} className="btn-primary" data-testid={`analyse-${sample.id}`}>
              {stage !== null ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ScanSearch className="h-4 w-4" aria-hidden="true" />} {result ? "Run again" : "Analyse this sample"}
            </button>
            <a href={sample.video} download className="btn-secondary"><Download className="h-4 w-4" aria-hidden="true" /> Download</a>
          </div>
          {stage !== null && (
            <ol className="space-y-2" aria-live="polite">
              {STAGES.map((s, i) => (
                <li key={s} className={`flex items-center gap-3 text-sm ${i <= current ? "text-white" : "text-chalk/50"}`}>
                  <span className={`h-2 w-2 rounded-full ${i < current ? "bg-good" : i === current ? "animate-pulse bg-accent-300" : "bg-white/15"}`} />{STAGE_LABEL[s]}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
      {result && (
        <div className="space-y-3">
          <p className="text-xs text-chalk/50" data-testid="sample-result-source">{result.note}</p>
          <ReportView report={result.report} coaching={result.coaching} truth={sample.ground_truth} rejected={result.report.quality.verdict === "reject"} />
        </div>
      )}
    </article>
  );
}
