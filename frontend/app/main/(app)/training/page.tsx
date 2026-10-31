"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BedDouble, Check, Loader2, RefreshCw, Sparkles, Target, Upload } from "lucide-react";
import { Empty, ErrorNote, Loading, Locked, PageHeader, Panel, Ring } from "@/components/main/ui";
import { api } from "@/lib/api";
import type { TrainingWeek } from "@/lib/main";

interface Current { locked: boolean; plan: TrainingWeek | null; has_analysis: boolean }

function dayName(weekOf: string, day: number) {
  const d = new Date(weekOf + "T12:00:00");
  d.setDate(d.getDate() + day - 1);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

export default function Training() {
  const [cur, setCur] = useState<Current | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api<Current>("/player/training").then(setCur).catch((e) => setError(e.message));
  }, []);

  async function build() {
    setBusy(true);
    setError(null);
    try {
      const plan = await api<TrainingWeek>("/player/training", { method: "POST" });
      setCur((c) => c && { ...c, plan });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(plan: TrainingWeek, sid: string) {
    const done = !plan.done.includes(sid);
    setCur((c) => c && c.plan && { ...c, plan: { ...c.plan, done: done ? [...c.plan.done, sid] : c.plan.done.filter((x) => x !== sid) } });
    try {
      const updated = await api<TrainingWeek>(`/player/training/${plan.id}/sessions`, { method: "POST", json: { session: sid, done } });
      setCur((c) => c && { ...c, plan: updated });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!cur) return error ? <ErrorNote message={error} /> : <Loading label="Loading your week" />;
  const header = (sub: string) => <PageHeader eyebrow="AI training plan" title="Your training week" sub={sub}
    action={cur.plan && !cur.locked ? <button type="button" onClick={build} disabled={busy} className="btn-secondary !py-2" data-testid="rebuild">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />} New week</button> : undefined} />;

  if (cur.locked) return <>{header("Five training days and two rest days, built from your numbers.")}<Locked testId="training-locked" title="Training plans come with AI Coach and Coach" text="Each week is written from your latest video and your card, using drills from a vetted library only." /></>;
  if (!cur.plan) {
    return (
      <>
        {header("Five training days and two rest days, built from your numbers.")}
        <section className="relative isolate overflow-hidden rounded-3xl border border-white/[0.08]">
          <Image src="/images/main/knee-touch.webp" alt="A player juggles the ball on her knee" fill sizes="100vw" className="-z-20 object-cover object-[50%_25%] opacity-40" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/30" />
          <div className="max-w-lg space-y-4 p-8 sm:p-12">
            {cur.has_analysis ? (
              <>
                <p className="font-display text-2xl font-semibold text-white">Build your week</p>
                <p className="text-chalk/75">The AI coach reads your last video, your best count and your card, then picks drills for your weakest areas. Every drill comes from our library, and every number is checked.</p>
                <button type="button" onClick={build} disabled={busy} className="btn-primary" data-testid="build-plan">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />} Build my week
                </button>
              </>
            ) : <Empty icon={Upload} title="Analyse a video first" text="The plan is built from your measured numbers." action={<Link href="/upload" className="btn-primary">Analyse a video</Link>} />}
            <ErrorNote message={error} />
          </div>
        </section>
      </>
    );
  }

  const plan = cur.plan;
  const total = plan.days.reduce((n, d) => n + d.sessions.length, 0);
  return (
    <>
      {header(`Week of ${new Date(plan.week_of + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long" })}`)}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Panel hud={plan.source === "ai" ? "AI coach · checked against your numbers" : "Built from your numbers"} title="This week's focus" testId="plan-summary">
          <p className="text-lg leading-relaxed text-white">{plan.summary}</p>
          <ul className="mt-4 flex flex-wrap gap-2">{plan.focus.map((f) => <li key={f} className="chip">{f}</li>)}</ul>
        </Panel>
        <Panel>
          <div className="flex items-center gap-5">
            <Ring value={(100 * plan.done.length) / Math.max(1, total)} size={110} label="Sessions done">
              <span className="figure text-2xl" data-testid="plan-progress">{plan.done.length}/{total}</span>
              <span className="hud !text-[9px]">sessions</span>
            </Ring>
            <div>
              <p className="hud flex items-center gap-1.5"><Target className="h-3.5 w-3.5" aria-hidden="true" /> Goal</p>
              <p className="mt-1"><span className="figure text-3xl">{plan.goal_touches}</span> <span className="text-sm text-chalk/60">touches</span></p>
              <Link href="/upload" className="mt-2 inline-block text-sm text-accent-200 hover:text-white">Test it: analyse a video</Link>
            </div>
          </div>
        </Panel>
      </div>
      <ErrorNote message={error} />

      <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4" data-testid="plan-days">
        {plan.days.map((d) => (
          <li key={d.day} className={`glass flex flex-col p-4 ${d.rest ? "opacity-70" : ""}`}>
            <p className="hud">{dayName(plan.week_of, d.day)}</p>
            <p className="mt-1 flex items-center gap-2 font-display text-lg font-semibold text-white">{d.rest && <BedDouble className="h-4 w-4 text-chalk/50" aria-hidden="true" />}{d.title}</p>
            {d.rest ? <p className="mt-2 text-sm text-chalk/60">Rest. Muscles get stronger between sessions.</p> : (
              <ul className="mt-3 space-y-2">
                {d.sessions.map((s, i) => {
                  const sid = `d${d.day}s${i}`;
                  const done = plan.done.includes(sid);
                  return (
                    <li key={sid} className="rounded-2xl border border-white/[0.06] bg-ink-950/40">
                      <div className="flex items-start gap-3 p-3">
                        <button type="button" onClick={() => toggle(plan, sid)} aria-pressed={done} aria-label={`${done ? "Undo" : "Mark done"}: ${s.name}`} data-testid={`session-${sid}`}
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${done ? "border-good bg-good/20 text-good" : "border-white/20 hover:border-accent-400"}`}>
                          {done && <Check className="h-4 w-4" aria-hidden="true" />}
                        </button>
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === sid ? null : sid)} aria-expanded={open === sid}>
                          <span className={`block text-sm font-medium ${done ? "text-chalk/50 line-through" : "text-white"}`}>{s.name}</span>
                          <span className="font-mono text-xs text-accent-200">{s.minutes} min · {s.reps}</span>
                        </button>
                      </div>
                      {open === sid && (
                        <div className="space-y-1.5 border-t border-white/[0.06] px-3 py-3 text-xs">
                          <p className="text-chalk/80">{s.how}</p>
                          <p className="text-chalk/50">{s.note}</p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
