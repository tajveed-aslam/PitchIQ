"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ErrorNote, Loading, Meter, PageHeader, Panel } from "@/components/main/ui";
import { api } from "@/lib/api";

interface Q { id: string; trait: string; text: string }
interface Result { score: number; detail: { traits: Record<string, number> }; new_badges: string[] }

const TRAIT_LABEL: Record<string, string> = {
  motivation: "Motivation", confidence: "Confidence", team_spirit: "Team spirit", leadership: "Leadership",
  communication: "Communication", emotional_control: "Emotional control",
};

export default function Mindset() {
  const [qs, setQs] = useState<{ questions: Q[]; scale: string[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ questions: Q[]; scale: string[] }>("/player/assessments/mindset").then(setQs).catch((e) => setError(e.message));
  }, []);
  if (!qs) return error ? <ErrorNote message={error} /> : <Loading label="Loading the questions" />;
  const done = Object.keys(answers).length;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      setResult(await api<Result>("/player/assessments/mindset", { method: "POST", json: { answers } }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <>
        <PageHeader eyebrow="Mindset · result" title={<>Your mindset score: <span className="text-gradient">{result.score}</span></>}
          sub="Your own view of how you train and play. Use it to pick what to work on, not as a verdict." />
        <Panel testId="mindset-result">
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(result.detail.traits).map(([k, v]) => <Meter key={k} label={TRAIT_LABEL[k] ?? k} value={v} />)}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/card" className="btn-primary">See it on your card</Link>
            <Link href="/assess" className="btn-secondary">Other tests</Link>
          </div>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Test · mindset" title="How do you train and play?" sub="Answer honestly: there are no right answers, and some statements are worded the other way round on purpose."
        action={<Link href="/assess" className="btn-secondary !py-2"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Tests</Link>} />
      <div className="sticky top-16 z-20 -mx-4 mb-6 bg-ink-950/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3 text-sm">
          <div className="h-1.5 flex-1 rounded-full bg-white/10"><div className="h-1.5 rounded-full bg-gradient-to-r from-accent-400 to-glow transition-all" style={{ width: `${(100 * done) / qs.questions.length}%` }} /></div>
          <span className="font-mono text-xs text-chalk/60">{done}/{qs.questions.length}</span>
        </div>
      </div>
      <ol className="space-y-3">
        {qs.questions.map((q, i) => (
          <li key={q.id} className="glass p-5">
            <fieldset>
              <legend className="text-white"><span className="mr-2 font-mono text-xs text-chalk/50">{String(i + 1).padStart(2, "0")}</span>{q.text}</legend>
              <div className="mt-4 grid grid-cols-5 gap-1.5">
                {qs.scale.map((label, v) => {
                  const on = answers[q.id] === v + 1;
                  return (
                    <label key={label} className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-center text-[11px] leading-tight transition sm:text-xs ${on ? "border-accent-400/60 bg-accent-400/15 text-white" : "border-white/10 text-chalk/60 hover:border-white/25 hover:text-chalk"}`}>
                      <input type="radio" name={q.id} value={v + 1} checked={on} onChange={() => setAnswers((a) => ({ ...a, [q.id]: v + 1 }))} className="sr-only" data-testid={`${q.id}-${v + 1}`} />
                      <span className="font-mono text-sm">{v + 1}</span>
                      <span className="hidden sm:block">{label}</span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 flex justify-between text-[11px] text-chalk/40 sm:hidden"><span>{qs.scale[0]}</span><span>{qs.scale[4]}</span></p>
            </fieldset>
          </li>
        ))}
      </ol>
      <div className="mt-6 space-y-3">
        <ErrorNote message={error} />
        <button type="button" onClick={submit} disabled={done < qs.questions.length || busy} className="btn-primary w-full !py-3.5 disabled:opacity-50 sm:w-auto" data-testid="mindset-submit">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} See my result
        </button>
      </div>
    </>
  );
}
