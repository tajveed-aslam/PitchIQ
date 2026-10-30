"use client";

import { useState } from "react";
import { Download, Loader2, ScanSearch } from "lucide-react";
import type { Sample } from "@/lib/samples";
import { ReportCard } from "./ReportCard";

// Until the analysis API is connected, "Analyse" reveals the report the same pipeline produced for this exact file
// (analysis/samples.py), after the stages the live job will report.
const STAGES = ["Uploading", "Checking video quality", "Tracking the ball", "Counting touches"];

export function SampleCard({ sample }: { sample: Sample }) {
  const [stage, setStage] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  function analyse() {
    setDone(false);
    setStage(0);
    STAGES.forEach((_, i) => setTimeout(() => setStage(i), i * 700));
    setTimeout(() => {
      setStage(null);
      setDone(true);
    }, STAGES.length * 700);
  }

  return (
    <article id={sample.id} className="card scroll-mt-24 overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4 p-5 sm:p-6">
          <video
            controls
            preload="none"
            playsInline
            poster={sample.poster}
            className="aspect-video w-full rounded-xl bg-black object-cover"
            aria-label={`Sample video: ${sample.title}`}
          >
            <source src={sample.video} type="video/mp4" />
          </video>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-3xl font-bold uppercase text-white">{sample.title}</h2>
              <span className="chip">{sample.level}</span>
            </div>
            <p className="mt-2 text-chalk/75">{sample.blurb}</p>
            <p className="mt-2 text-xs text-chalk/50">
              {sample.report.video.duration_s.toFixed(0)} s · Video: {sample.credit}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={analyse} disabled={stage !== null} className="btn-primary disabled:opacity-70" data-testid={`analyse-${sample.id}`}>
              {stage !== null ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ScanSearch className="h-5 w-5" aria-hidden="true" />}
              {done ? "Analyse again" : "Analyse this sample"}
            </button>
            <a href={sample.video} download className="btn-secondary">
              <Download className="h-5 w-5" aria-hidden="true" /> Download
            </a>
          </div>
          <p className="text-xs text-chalk/50">
            Download it to try the normal upload flow from your phone or laptop.
          </p>
        </div>

        <div className="border-t border-white/10 bg-ink-900/60 p-5 sm:p-6 lg:border-l lg:border-t-0" aria-live="polite">
          {stage !== null && (
            <ol className="space-y-3 py-6">
              {STAGES.map((s, i) => (
                <li key={s} className={`flex items-center gap-3 text-sm ${i <= stage ? "text-white" : "text-chalk/40"}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${i < stage ? "bg-pitch-400" : i === stage ? "animate-pulse bg-pitch-300" : "bg-ink-600"}`} />
                  {s}
                </li>
              ))}
            </ol>
          )}
          {done && <ReportCard report={sample.report} truth={sample.ground_truth} />}
          {stage === null && !done && (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center text-chalk/60">
              <ScanSearch className="h-10 w-10 text-pitch-400/70" aria-hidden="true" />
              <p>Press <span className="text-white">Analyse this sample</span> to see the report,</p>
              <p className="text-sm">with the hand count beside the AI&apos;s.</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
