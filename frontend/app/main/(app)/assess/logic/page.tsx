"use client";

// Logic test: 8 sequence puzzles. The server sends the puzzles with a signed token and grades the answers itself.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { ErrorNote, Loading, PageHeader, Panel } from "@/components/main/ui";
import { api } from "@/lib/api";

interface Test { token: string; minutes: number; questions: { sequence: number[]; options: number[] }[] }
interface Result { score: number; detail: { correct: number; total: number; seconds: number }; new_badges: string[] }

export default function Logic() {
  const [test, setTest] = useState<Test | null>(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(0);

  function start() {
    setTest(null);
    setResult(null);
    setAnswers([]);
    setI(0);
    api<Test>("/player/assessments/logic").then((t) => { setTest(t); started.current = Date.now(); }).catch((e) => setError(e.message));
  }
  useEffect(start, []);

  async function choose(option: number) {
    if (!test || busy) return;
    const all = [...answers, option];
    setAnswers(all);
    if (all.length < test.questions.length) return setI(i + 1);
    setBusy(true);
    try {
      setResult(await api<Result>("/player/assessments/logic", { method: "POST", json: {
        token: test.token, answers: all, seconds: Math.round((Date.now() - started.current) / 1000),
      } }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const header = <PageHeader eyebrow="Test · logic" title="Spot the pattern" sub="Each row follows a rule. Pick the number that comes next."
    action={<Link href="/assess" className="btn-secondary !py-2"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Tests</Link>} />;

  if (result) {
    return (
      <>
        {header}
        <Panel testId="logic-result">
          <p className="hud">Result</p>
          <p className="mt-2"><span className="figure text-6xl">{result.detail.correct}/{result.detail.total}</span> <span className="text-chalk/60">in {result.detail.seconds} s · rating {result.score}</span></p>
          {result.new_badges.includes("sharp_mind") && <p className="mt-3 text-sm text-good">Badge earned: Sharp mind</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/card" className="btn-primary">See it on your card</Link>
            <button type="button" onClick={start} className="btn-secondary"><RotateCcw className="h-4 w-4" aria-hidden="true" /> New puzzles</button>
          </div>
        </Panel>
      </>
    );
  }
  if (!test) return <>{header}{error ? <ErrorNote message={error} /> : <Loading label="Making your puzzles" />}</>;
  const q = test.questions[i];
  return (
    <>
      {header}
      <Panel testId="logic-question">
        <div className="flex items-center justify-between">
          <p className="hud">Puzzle {i + 1} of {test.questions.length}</p>
          <div className="flex gap-1" aria-hidden="true">{test.questions.map((_, k) => <span key={k} className={`h-1.5 w-6 rounded-full ${k < i ? "bg-accent-400" : k === i ? "bg-accent-200" : "bg-white/10"}`} />)}</div>
        </div>
        <p className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3" aria-label={`Sequence: ${q.sequence.join(", ")}, then what?`}>
          {q.sequence.map((n, k) => <span key={k} className="flex h-14 min-w-14 items-center justify-center rounded-2xl border border-white/10 bg-ink-950/60 px-3 font-mono text-xl text-white sm:h-16 sm:min-w-16 sm:text-2xl">{n}</span>)}
          <span className="flex h-14 min-w-14 items-center justify-center rounded-2xl border border-dashed border-accent-400/60 font-mono text-xl text-accent-300 sm:h-16 sm:min-w-16 sm:text-2xl">?</span>
        </p>
        <div className="mx-auto mt-10 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
          {q.options.map((o, k) => (
            <button key={k} type="button" onClick={() => choose(k)} disabled={busy} className="rounded-2xl border border-white/10 bg-white/5 py-4 font-mono text-xl text-white transition hover:border-accent-400/60 hover:bg-accent-400/10" data-testid={`option-${k}`}>
              {o}
            </button>
          ))}
        </div>
        {busy && <p className="mt-6 flex items-center justify-center gap-2 text-sm text-chalk/60"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking your answers…</p>}
        <ErrorNote message={error} />
      </Panel>
    </>
  );
}
