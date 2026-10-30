"use client";

import { useRef, useState } from "react";
import { Download, Loader2, ScanSearch } from "lucide-react";
import { api, STAGE_LABEL, type Coaching } from "@/lib/api";
import type { Report, Sample } from "@/lib/samples";
import { CoachingPanel } from "./CoachingPanel";
import { ReportCard } from "./ReportCard";

// "Analyse" runs the sample through the real pipeline on the server (POST /samples/{id}/analyse, then polling).
// If the service is asleep, busy or rate-limited, the report the same pipeline produced for this exact file
// (analysis/samples.py) is shown instead, and the page says so.
const STAGES = ["queued", "quality", "tracking", "counting"];

interface Job {
  status: "queued" | "processing" | "done" | "failed";
  stage: string;
  report: Report | null;
  coaching: Coaching | null;
  error?: string | null;
}

export function SampleCard({ sample }: { sample: Sample }) {
  const [stage, setStage] = useState<string | null>(null);
  const [result, setResult] = useState<{ report: Report; coaching: Coaching | null; live: boolean; note?: string } | null>(null);
  const cancelled = useRef(false);

  function fallback(note: string) {
    setStage(null);
    setResult({ report: sample.report, coaching: null, live: false, note });
  }

  async function analyse() {
    setResult(null);
    setStage("queued");
    cancelled.current = false;
    try {
      const { job_id } = await api<{ job_id: string }>(`/samples/${sample.id}/analyse`, { method: "POST" });
      const started = Date.now();
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled.current) return;
        const j = await api<Job>(`/samples/jobs/${job_id}`);
        if (j.status === "done" && j.report) {
          setStage(null);
          return setResult({ report: j.report, coaching: j.coaching, live: true });
        }
        if (j.status === "failed") return fallback(j.error || "The live run failed, so this is the stored result.");
        setStage(j.stage);
        if (Date.now() - started > 180_000) return fallback("The live run is taking too long, so this is the stored result.");
      }
    } catch (e) {
      fallback(`${(e as Error).message} Showing the stored result from the same pipeline.`);
    }
  }

  const current = stage ? Math.max(0, STAGES.indexOf(stage)) : 0;
  return (
    <article id={sample.id} className="card scroll-mt-24 overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4 p-5 sm:p-6">
          <video controls preload="none" playsInline poster={sample.poster} className="aspect-video w-full rounded-xl bg-black object-cover" aria-label={`Sample video: ${sample.title}`}>
            <source src={sample.video} type="video/mp4" />
          </video>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-3xl font-bold uppercase text-white">{sample.title}</h2>
              <span className="chip">{sample.level}</span>
            </div>
            <p className="mt-2 text-chalk/75">{sample.blurb}</p>
            <p className="mt-2 text-xs text-chalk/50">{sample.report.video.duration_s.toFixed(0)} s · Video: {sample.credit}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={analyse} disabled={stage !== null} className="btn-primary disabled:opacity-70" data-testid={`analyse-${sample.id}`}>
              {stage !== null ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ScanSearch className="h-5 w-5" aria-hidden="true" />}
              {result ? "Analyse again" : "Analyse this sample"}
            </button>
            <a href={sample.video} download className="btn-secondary">
              <Download className="h-5 w-5" aria-hidden="true" /> Download
            </a>
          </div>
          <p className="text-xs text-chalk/50">Download it to try the normal upload flow from your phone or laptop.</p>
        </div>

        <div className="space-y-4 border-t border-white/10 bg-ink-900/60 p-5 sm:p-6 lg:border-l lg:border-t-0" aria-live="polite">
          {stage !== null && (
            <div className="space-y-3 py-6">
              <ol className="space-y-3">
                {STAGES.map((s, i) => (
                  <li key={s} className={`flex items-center gap-3 text-sm ${i <= current ? "text-white" : "text-chalk/40"}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${i < current ? "bg-pitch-400" : i === current ? "animate-pulse bg-pitch-300" : "bg-ink-600"}`} />
                    {STAGE_LABEL[s]}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-chalk/55">Running the real analysis on the server. If it has been asleep, the first run takes a little longer.</p>
            </div>
          )}
          {result && (
            <>
              <p className="text-xs text-chalk/60" data-testid="sample-result-source">
                {result.live ? "Live result: analysed just now on the server." : result.note}
              </p>
              <ReportCard report={result.report} truth={sample.ground_truth} />
              {result.coaching && <CoachingPanel coaching={result.coaching} />}
            </>
          )}
          {stage === null && !result && (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center text-chalk/60">
              <ScanSearch className="h-10 w-10 text-pitch-400/70" aria-hidden="true" />
              <p>Press <span className="text-white">Analyse this sample</span> to run the AI on it,</p>
              <p className="text-sm">then compare its count with the hand count.</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
