import { AlertTriangle, CheckCircle2, Gauge, Timer, Waves, XCircle } from "lucide-react";
import { controlLabel, rhythmLabel, type Report } from "@/lib/samples";
import { TouchTimeline } from "./TouchTimeline";

interface Props {
  report: Report;
  truth?: { touches: number | null; touch_times_s: number[] | null };
}

const VERDICT = {
  ok: { icon: CheckCircle2, text: "Good video", cls: "text-pitch-300 bg-pitch-400/10 border-pitch-400/30" },
  warn: { icon: AlertTriangle, text: "Usable, with warnings", cls: "text-flare bg-flare/10 border-flare/30" },
  reject: { icon: XCircle, text: "Please re-film", cls: "text-flare bg-flare/10 border-flare/40" },
};

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Gauge; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-ink-900/80 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-chalk/60">
        <Icon className="h-4 w-4 text-pitch-400" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-chalk/60">{sub}</p>
    </div>
  );
}

export function ReportCard({ report, truth }: Props) {
  const m = report.metrics;
  const v = VERDICT[report.quality.verdict];
  const [lo, hi] = m.touches_range;
  const scaleMax = Math.max(hi, truth?.touches ?? 0, m.touches) * 1.15 || 1;
  const pct = (n: number) => `${(100 * n) / scaleMax}%`;

  return (
    <div className="card space-y-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${v.cls}`}>
          <v.icon className="h-4 w-4" aria-hidden="true" />
          {v.text}
        </span>
        <span className="text-xs text-chalk/50">
          Analysed in {report.timing.analysis_s} s · model {report.model_version}
        </span>
      </div>

      {report.quality.issues.length > 0 && (
        <ul className="space-y-2">
          {report.quality.issues.map((i) => (
            <li key={i.code} className="flex gap-2 rounded-lg bg-flare/10 p-3 text-sm text-chalk">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-flare" aria-hidden="true" />
              {i.message}
            </li>
          ))}
        </ul>
      )}

      <div className="grid items-end gap-6 sm:grid-cols-[auto_1fr]">
        <div>
          <p className="eyebrow">Touches</p>
          <p className="font-display text-7xl font-extrabold leading-none text-white" data-testid="touch-count">
            {m.touches}
          </p>
          <p className="mt-1 text-sm text-chalk/70">
            likely {lo}–{hi} · {m.touches_certain} seen clearly
          </p>
        </div>
        <div className="space-y-2" aria-label={`Likely range ${lo} to ${hi} touches`}>
          <div className="relative h-3 rounded-full bg-ink-950">
            <div className="absolute inset-y-0 rounded-full bg-pitch-400/30" style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }} />
            <div className="absolute -top-1 h-5 w-1.5 -translate-x-1/2 rounded-full bg-pitch-400" style={{ left: pct(m.touches) }} />
            {truth?.touches != null && (
              <div className="absolute -top-1.5 h-6 w-0.5 -translate-x-1/2 bg-white" style={{ left: pct(truth.touches) }} />
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-chalk/60">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-pitch-400" />AI count</span>
            <span><span className="mr-1 inline-block h-2 w-4 rounded-full bg-pitch-400/30" />likely range</span>
            {truth?.touches != null && (
              <span><span className="mr-1 inline-block h-3 w-0.5 bg-white align-middle" />hand count: {truth.touches}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Timer} label="Pace" value={m.touches_per_minute ? `${Math.round(m.touches_per_minute)}/min` : "–"} sub="touches per minute" />
        <Stat icon={Waves} label="Rhythm" value={rhythmLabel(m.interval_s?.cv)} sub={m.interval_s ? `${m.interval_s.mean.toFixed(2)} s between touches` : "–"} />
        <Stat icon={Gauge} label="Control" value={controlLabel(m.arc_height_balls?.mean)} sub={m.arc_height_balls ? `ball rises ~${m.arc_height_balls.mean.toFixed(1)}× its size` : "–"} />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-white">When each touch happened</p>
        <TouchTimeline duration={report.video.duration_s} ai={m.touch_times_s} truth={truth?.touch_times_s} />
      </div>

      <p className="text-xs text-chalk/50">{report.notes.join(" ")}</p>
    </div>
  );
}
