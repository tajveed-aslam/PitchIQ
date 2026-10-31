"use client";

// Reaction test: the panel goes gold after a random 1.5-4 s; tap (or press Space) as fast as you can, 5 times.
// Tapping early is a false start: counted, and that round restarts. A tap slower than the server's limit (1.5 s:
// distracted, not a reaction) also repeats the round instead of failing the whole test at the end.
// Timing uses performance.now() on pointerdown.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { ErrorNote, PageHeader, Panel } from "@/components/main/ui";
import { api } from "@/lib/api";

const TRIALS = 5;
const SLOWEST_MS = 1500; // matches the API (services/assessments.py)
type Phase = "idle" | "wait" | "go" | "early" | "slow" | "saving" | "done";
interface Result { score: number; detail: { median_ms: number; best_ms: number; times_ms: number[]; false_starts: number }; new_badges: string[] }

export default function Reaction() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [times, setTimes] = useState<number[]>([]);
  const [early, setEarly] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const shownAt = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  function arm() {
    setPhase("wait");
    timer.current = setTimeout(() => {
      shownAt.current = performance.now();
      setPhase("go");
    }, 1500 + Math.random() * 2500);
  }

  async function save(all: number[], falseStarts: number) {
    setPhase("saving");
    try {
      setResult(await api<Result>("/player/assessments/reaction", { method: "POST", json: { times_ms: all, false_starts: falseStarts } }));
      setPhase("done");
    } catch (e) {
      setError((e as Error).message);
      setPhase("idle");
      setTimes([]);
    }
  }

  function tap() {
    if (phase === "idle" || phase === "early" || phase === "slow") return arm();
    if (phase === "wait") {
      clearTimeout(timer.current);
      setEarly((n) => n + 1);
      return setPhase("early");
    }
    if (phase === "go") {
      const ms = Math.round(performance.now() - shownAt.current);
      if (ms > SLOWEST_MS) return setPhase("slow");
      const all = [...times, ms];
      setTimes(all);
      if (all.length >= TRIALS) return save(all, early);
      arm();
    }
  }

  function restart() {
    setTimes([]);
    setEarly(0);
    setResult(null);
    setError(null);
    setPhase("idle");
  }

  const big = phase === "go" ? "Tap!" : phase === "wait" ? "Wait for gold…" : phase === "early" ? "Too soon! Tap to try that round again" : phase === "slow" ? "Too slow: tap to try that round again" : phase === "saving" ? "Saving…" : times.length ? "Tap to continue" : "Tap to start";
  return (
    <>
      <PageHeader eyebrow="Test · reaction" title="How fast do you react?" sub={`Tap the panel the moment it turns gold. ${TRIALS} rounds; we use your median.`}
        action={<Link href="/assess" className="btn-secondary !py-2"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Tests</Link>} />
      {phase !== "done" ? (
        <>
          <button type="button" onPointerDown={(e) => { e.preventDefault(); tap(); }}
            onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); tap(); } }}
            disabled={phase === "saving"} data-testid="reaction-pad" data-phase={phase}
            className={`flex h-[52vh] min-h-[280px] w-full select-none flex-col items-center justify-center gap-3 rounded-3xl border text-center transition-colors duration-75 ${
              phase === "go" ? "border-accent-300 bg-gradient-to-br from-accent-300 to-accent-500 text-ink-950"
              : phase === "early" || phase === "slow" ? "border-flare/40 bg-flare/15 text-white"
              : phase === "wait" ? "border-white/10 bg-ink-800 text-chalk" : "glass text-white"}`}>
            {phase === "saving" && <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />}
            <span className="font-display text-3xl font-semibold sm:text-5xl" aria-live="assertive">{big}</span>
            <span className={`font-mono text-sm ${phase === "go" ? "text-ink-950/70" : "text-chalk/60"}`}>Round {Math.min(times.length + 1, TRIALS)} of {TRIALS}</span>
          </button>
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Your taps so far">
            {times.map((t, i) => <span key={i} className="chip font-mono">{t} ms</span>)}
            {early > 0 && <span className="chip !text-flare">{early} false start{early > 1 ? "s" : ""}</span>}
          </div>
          <ErrorNote message={error} />
          <p className="mt-4 text-xs text-chalk/50">Phone screens add a little delay, so the scoring bands allow for it: 220 ms or faster rates 99.</p>
        </>
      ) : result && (
        <Panel testId="reaction-result">
          <p className="hud">Median reaction</p>
          <p className="mt-2"><span className="figure text-6xl">{result.detail.median_ms}</span> <span className="text-chalk/60">ms · rating {result.score}</span></p>
          <p className="mt-2 text-sm text-chalk/70">Best {result.detail.best_ms} ms · taps {result.detail.times_ms.join(", ")} ms{result.detail.false_starts ? ` · ${result.detail.false_starts} false start(s)` : ""}</p>
          {result.new_badges.includes("lightning") && <p className="mt-3 text-sm text-good">Badge earned: Lightning</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/card" className="btn-primary">See it on your card</Link>
            <button type="button" onClick={restart} className="btn-secondary"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Try again</button>
          </div>
        </Panel>
      )}
    </>
  );
}
