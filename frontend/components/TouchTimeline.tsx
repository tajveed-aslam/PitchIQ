// Two rows of ticks on a time axis: where the AI found touches and (optionally) where a person counted them.
// Lets anyone see at a glance which touches matched, were missed or were extra.

interface Props {
  duration: number;
  ai: number[];
  truth?: number[] | null;
}

const MATCH_S = 0.25; // same tolerance the accuracy tests use

function Row({ label, times, matched, duration, tone }: {
  label: string;
  times: number[];
  matched: (t: number) => boolean;
  duration: number;
  tone: "ai" | "truth";
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-right font-display text-xs font-bold uppercase tracking-wider text-chalk/60">
        {label}
      </span>
      <div className="relative h-7 flex-1 rounded-md bg-ink-950/70" role="img" aria-label={`${label}: ${times.length} touches`}>
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
        {times.map((t, i) => {
          const ok = matched(t);
          const color = ok ? (tone === "ai" ? "bg-accent-400" : "bg-white") : "bg-flare";
          return (
            <span
              key={i}
              title={`${t.toFixed(2)} s${ok ? "" : tone === "ai" ? " (no matching hand count)" : " (missed by AI)"}`}
              className={`absolute top-1 h-5 w-1 -translate-x-1/2 rounded-full ${color}`}
              style={{ left: `${Math.min(100, (100 * t) / duration)}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function TouchTimeline({ duration, ai, truth }: Props) {
  const near = (list: number[] | null | undefined) => (t: number) =>
    !list || list.some((x) => Math.abs(x - t) <= MATCH_S);
  return (
    <div className="space-y-2">
      <Row label="AI" times={ai} matched={near(truth)} duration={duration} tone="ai" />
      {truth && <Row label="Hand" times={truth} matched={near(ai)} duration={duration} tone="truth" />}
      <div className="flex justify-between pl-[4.75rem] text-[11px] text-chalk/60">
        <span>0 s</span>
        <span>{duration.toFixed(0)} s</span>
      </div>
      {truth && (
        <p className="pl-[4.75rem] text-xs text-chalk/60">
          <span className="text-flare">Orange</span> ticks didn&apos;t match (within {MATCH_S} s) on the other row.
        </p>
      )}
    </div>
  );
}
