"use client";

// Main's "analysis command centre" for one report: the count with its likely range, the measured metrics, the
// touch timeline (with the hand count when there is one), the gap between touches, the quality check and the
// coaching. Used by /reports/[id], a coach's view of a player's report, and the samples page.
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Dumbbell, Lock, ShieldCheck, Sparkles, Target, ThumbsUp, Wrench } from "lucide-react";
import { TouchTimeline } from "@/components/TouchTimeline";
import type { Coaching } from "@/lib/api";
import { controlLabel, rhythmLabel, type Report } from "@/lib/samples";
import { LineChart } from "./charts";
import { Panel } from "./ui";

export function RangeBar({ value, range, truth }: { value: number; range: [number, number]; truth?: number | null }) {
  const max = Math.max(range[1], truth ?? 0, value) * 1.25 || 10;
  const pct = (v: number) => `${(100 * v) / max}%`;
  return (
    <div className="space-y-2">
      <div className="relative h-3 rounded-full bg-white/[0.06]" role="img" aria-label={`Count ${value}, likely between ${range[0]} and ${range[1]}${truth != null ? `, hand count ${truth}` : ""}`}>
        <div className="absolute inset-y-0 rounded-full bg-accent-400/30" style={{ left: pct(range[0]), width: `calc(${pct(range[1])} - ${pct(range[0])})` }} />
        <div className="absolute -top-1 h-5 w-1.5 -translate-x-1/2 rounded-full bg-accent-300" style={{ left: pct(value) }} />
        {truth != null && <div className="absolute -top-1.5 h-6 w-0.5 -translate-x-1/2 bg-white" style={{ left: pct(truth) }} />}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-chalk/60">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent-300" /> AI count {value}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-accent-400/30" /> likely {range[0]}–{range[1]}</span>
        {truth != null && <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-white" /> hand count {truth}</span>}
      </div>
    </div>
  );
}

export function CoachingView({ coaching, locked }: { coaching: Coaching | null; locked?: boolean }) {
  if (locked) {
    return (
      <Panel hud="AI coach" testId="coaching-locked">
        <p className="flex items-center gap-2 text-white"><Lock className="h-4 w-4 text-accent-300" aria-hidden="true" /> Coaching written from your numbers comes with AI Coach and Coach.</p>
        <Link href="/settings#plan" className="btn-secondary mt-4 !py-2">See plans</Link>
      </Panel>
    );
  }
  if (!coaching) return null;
  return (
    <Panel hud={coaching.source === "ai" ? "AI coach · checked against your numbers" : "Coaching from your numbers"} title={<span className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent-300" aria-hidden="true" /> Your coach says</span>} testId="coaching">
      <p className="text-lg leading-relaxed text-white">{coaching.summary}</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="hud mb-2 flex items-center gap-2 !text-good"><ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" /> Going well</p>
          <ul className="space-y-1.5 text-sm text-chalk/85">{coaching.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <div>
          <p className="hud mb-2 flex items-center gap-2 !text-flare"><Wrench className="h-3.5 w-3.5" aria-hidden="true" /> Work on</p>
          <ul className="space-y-1.5 text-sm text-chalk/85">{coaching.focus.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      </div>
      <p className="hud mb-3 mt-7 flex items-center gap-2"><Dumbbell className="h-3.5 w-3.5" aria-hidden="true" /> Drills</p>
      <div className="grid gap-3 md:grid-cols-3">
        {coaching.drills.map((d) => (
          <article key={d.name} className="rounded-2xl border border-white/[0.06] bg-ink-950/50 p-4">
            <h3 className="font-display font-semibold text-white">{d.name}</h3>
            <p className="mt-0.5 font-mono text-xs text-accent-300">{d.reps}</p>
            <p className="mt-2 text-sm text-chalk/75">{d.how}</p>
            {d.why && <p className="mt-2 text-xs text-chalk/50">{d.why}</p>}
          </article>
        ))}
      </div>
      <p className="mt-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-accent-400/15 to-glow/10 px-4 py-3 text-white">
        <Target className="h-5 w-5 shrink-0 text-accent-300" aria-hidden="true" /> {coaching.next_goal}
      </p>
    </Panel>
  );
}

export function ReportView({ report, coaching, coachingLocked, truth, rejected }: {
  report: Report; coaching?: Coaching | null; coachingLocked?: boolean;
  truth?: { touches: number | null; touch_times_s: number[] | null } | null; rejected?: boolean;
}) {
  const m = report.metrics;
  const q = report.quality;
  const times = m.touch_times_s;
  const intervals = times.slice(1).map((t, i) => Math.round((t - times[i]) * 100) / 100);
  const tiles = [
    { k: "Pace", v: m.touches_per_minute != null ? `${Math.round(m.touches_per_minute)}` : "–", u: "per min", s: "touches per minute" },
    { k: "Rhythm", v: rhythmLabel(m.interval_s?.cv), u: "", s: m.interval_s ? `${m.interval_s.mean.toFixed(2)} s between touches` : "" },
    { k: "Control", v: controlLabel(m.arc_height_balls?.mean), u: "", s: m.arc_height_balls ? `ball rises ${m.arc_height_balls.mean.toFixed(1)} ball sizes` : "" },
    { k: "Seen clearly", v: `${m.touches_certain}`, u: `of ${m.touches}`, s: "touches the camera saw" },
  ];
  return (
    <div className="space-y-4" data-testid="report-view">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Panel hud={rejected ? "Not reliable: re-film" : "Touches"}>
          <p className="flex items-baseline gap-3"><span className={`figure text-7xl ${rejected ? "text-chalk/40" : ""}`} data-testid="touches">{m.touches}</span><span className="text-chalk/60">touches in {report.video.duration_s.toFixed(0)} s</span></p>
          <div className="mt-6"><RangeBar value={m.touches} range={m.touches_range} truth={truth?.touches} /></div>
        </Panel>
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <div key={t.k} className="glass p-4">
              <p className="hud">{t.k}</p>
              <p className="mt-2"><span className="figure text-2xl">{t.v}</span> <span className="text-xs text-chalk/60">{t.u}</span></p>
              <p className="mt-0.5 text-xs text-chalk/50">{t.s}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel hud="Timeline" title="Every touch, in time">
          <TouchTimeline duration={report.video.duration_s} ai={times} truth={truth?.touch_times_s} />
          {intervals.length > 2 && (
            <div className="mt-6">
              <p className="hud mb-2">Seconds between touches</p>
              <LineChart ariaLabel="Seconds between each pair of touches" height={150} testId="interval-chart"
                series={[{ name: "Gap", color: "series-1", points: intervals.map((v, i) => ({ x: i + 1, y: v, label: `touch ${i + 1} → ${i + 2}` })) }]}
                xLabel={(x) => `touch ${x}`} yUnit=" s" />
              <p className="mt-1 text-xs text-chalk/50">A flat line is an even rhythm; spikes are where you lost the beat.</p>
            </div>
          )}
        </Panel>
        <Panel hud="Quality check" title={q.verdict === "reject" ? "Please re-film" : "Video accepted"}>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between"><span className="text-chalk/70">Ball found in</span><span className="font-mono text-white">{q.ball_seen_pct}% of frames</span></li>
            <li className="flex items-center justify-between"><span className="text-chalk/70">Camera moving</span><span className="font-mono text-white">{q.camera_moving_pct}% of the time</span></li>
            <li className="flex items-center justify-between"><span className="text-chalk/70">Ball size</span><span className="font-mono text-white">{q.ball_size_pct}% of the frame</span></li>
          </ul>
          <div className="mt-4 space-y-2">
            {q.issues.length ? q.issues.map((i) => (
              <p key={i.code} className="flex gap-2 rounded-xl bg-flare/10 px-3 py-2 text-sm text-flare"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{i.message}</p>
            )) : <p className="flex items-center gap-2 text-sm text-good"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> No problems found</p>}
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-chalk/50"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Model {report.model_version} · analysed in {report.timing.analysis_s} s</p>
        </Panel>
      </div>
      {!rejected && (coaching || coachingLocked) && <CoachingView coaching={coaching ?? null} locked={coachingLocked} />}
    </div>
  );
}
