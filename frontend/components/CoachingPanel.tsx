import Link from "next/link";
import { Dumbbell, Lock, Sparkles, Target, ThumbsUp, Wrench } from "lucide-react";
import type { Coaching } from "@/lib/api";

export function CoachingPanel({ coaching, locked }: { coaching: Coaching | null; locked?: boolean }) {
  if (locked) {
    return (
      <div className="card flex flex-col items-start gap-3 p-6" data-testid="coaching-locked">
        <p className="flex items-center gap-2 font-semibold text-white"><Lock className="h-5 w-5 text-accent-400" aria-hidden="true" /> AI coaching</p>
        <p className="text-chalk/75">Feedback and drills written from your numbers come with the AI Coach plan.</p>
        <Link href="/profile#plan" className="btn-secondary">See plans</Link>
      </div>
    );
  }
  if (!coaching) return null;
  return (
    <div className="card space-y-6 p-5 sm:p-6" data-testid="coaching">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold uppercase text-white">
          <Sparkles className="h-5 w-5 text-accent-400" aria-hidden="true" /> Your coach says
        </h2>
        <span className="chip" title={coaching.note}>{coaching.source === "ai" ? "AI coach · checked against your numbers" : "Coaching from your numbers"}</span>
      </div>
      <p className="text-lg text-white">{coaching.summary}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent-300"><ThumbsUp className="h-4 w-4" aria-hidden="true" /> Going well</p>
          <ul className="space-y-1.5 text-chalk/85">{coaching.strengths.map((s) => <li key={s}>• {s}</li>)}</ul>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-flare"><Wrench className="h-4 w-4" aria-hidden="true" /> Work on</p>
          <ul className="space-y-1.5 text-chalk/85">{coaching.focus.map((s) => <li key={s}>• {s}</li>)}</ul>
        </div>
      </div>
      <div>
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white"><Dumbbell className="h-4 w-4 text-accent-400" aria-hidden="true" /> Drills for this week</p>
        <div className="grid gap-3 md:grid-cols-3">
          {coaching.drills.map((d) => (
            <article key={d.name} className="rounded-xl bg-ink-900 p-4">
              <h3 className="font-display text-xl font-bold uppercase text-white">{d.name}</h3>
              <p className="mt-0.5 text-sm font-semibold text-accent-300">{d.reps}</p>
              <p className="mt-2 text-sm text-chalk/80">{d.how}</p>
              {d.why && <p className="mt-2 text-xs italic text-chalk/60">{d.why}</p>}
            </article>
          ))}
        </div>
      </div>
      <p className="flex items-center gap-2 rounded-xl bg-accent-400/10 px-4 py-3 text-white">
        <Target className="h-5 w-5 shrink-0 text-accent-400" aria-hidden="true" /> {coaching.next_goal}
      </p>
    </div>
  );
}
