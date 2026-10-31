"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChartLine, Trophy, Upload } from "lucide-react";
import { Columns, LineChart } from "@/components/main/charts";
import { Empty, ErrorNote, Loading, Locked, PageHeader, Panel, Stat } from "@/components/main/ui";
import { api } from "@/lib/api";
import { shortDate, TEST_LABEL, type Progress } from "@/lib/main";

const DAY = 86_400_000;

export default function ProgressPage() {
  const [p, setP] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Progress>("/insights/progress").then(setP).catch((e) => setError(e.message));
  }, []);
  if (error) return <ErrorNote message={error} />;
  if (!p) return <Loading label="Crunching your numbers" />;
  const header = <PageHeader eyebrow="Analytics" title="Progress" sub="Every metric from every accepted video, over time." />;
  if (p.locked) return <>{header}<Locked testId="progress-locked" title="Progress analytics are on paid plans" text="Skill Analysis, AI Coach and Coach show your trend, personal bests and every metric over time." /></>;
  if (p.points.length < 2) return <>{header}<Empty icon={ChartLine} title="Two sessions make a trend" text="Analyse at least two videos to see your progress here." action={<Link href="/upload" className="btn-primary"><Upload className="h-4 w-4" aria-hidden="true" /> Analyse a video</Link>} /></>;

  const t0 = new Date(p.points[0].date).getTime();
  const day = (iso: string) => Math.round(((new Date(iso).getTime() - t0) / DAY) * 10) / 10;
  const dateOf = (d: number) => shortDate(new Date(t0 + d * DAY).toISOString());
  const s = p.summary;
  const ahead = p.trend?.ahead[p.trend.ahead.length - 1];

  return (
    <>
      {header}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Sessions" value={s.sessions} hint="accepted videos" />
        <Stat label="Best" value={s.best} unit="touches" testId="progress-best" />
        <Stat label="Recent average" value={s.recent_avg} unit="touches" delta={s.change} hint="vs your first five" />
        <Stat label="Trend" value={p.trend ? `${p.trend.per_week > 0 ? "+" : ""}${p.trend.per_week}` : "–"} unit="per week" hint={p.trend ? "straight-line fit" : "needs 4 sessions"} />
      </div>

      <Panel hud="Touches per session" title="Your count over time" className="mt-4" testId="progress-chart">
        <LineChart ariaLabel="Touches in each session, with the likely range and a trend line" height={280}
          series={[{ name: "Touches", color: "series-1", points: p.points.map((x) => ({ x: day(x.date), y: x.touches, label: x.title, band: x.range })) }]}
          trend={p.trend ? p.trend.line.map((l) => ({ x: l.day, y: l.touches })) : undefined}
          xLabel={dateOf} tableHeaders={["Date", "Touches"]} />
        <p className="mt-3 text-xs text-chalk/50">
          Shaded: the likely range for each video. Dashed: a straight line fitted to your sessions.
          {ahead && p.trend!.per_week > 0 && ` If the trend held for four more weeks it would reach about ${Math.round(ahead.touches)} touches. That's a trend, not a promise.`}
        </p>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel hud="Rhythm" title="Spread of the gap between touches">
          <LineChart ariaLabel="Rhythm spread per session, lower is steadier" height={180}
            series={[{ name: "Rhythm spread", color: "series-1", points: p.points.filter((x) => x.rhythm_cv != null).map((x) => ({ x: day(x.date), y: x.rhythm_cv, label: x.rhythm })) }]}
            xLabel={dateOf} />
          <p className="mt-2 text-xs text-chalk/50">Lower is steadier. Under 0.45 reads as a steady rhythm.</p>
        </Panel>
        <Panel hud="Control" title="How high the ball rises">
          <LineChart ariaLabel="Average ball height in ball sizes per session, lower is tighter control" height={180} yUnit=""
            series={[{ name: "Ball height", color: "series-1", points: p.points.filter((x) => x.arc != null).map((x) => ({ x: day(x.date), y: x.arc, label: x.control })) }]}
            xLabel={dateOf} />
          <p className="mt-2 text-xs text-chalk/50">In ball sizes. Lower and steadier means tighter control.</p>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel hud="Consistency" title="Sessions per week" className="lg:col-span-2">
          <Columns ariaLabel="Analysed sessions in each of the last 12 weeks" data={p.weeks.map((w, i) => ({ label: shortDate(w.week), value: w.sessions, highlight: i === p.weeks.length - 1 }))} />
          <p className="mt-2 text-xs text-chalk/50">Last 12 weeks; the brightest column is this week.</p>
        </Panel>
        <Panel hud="Milestones" title="Personal bests">
          <ol className="space-y-2.5">
            {[...p.personal_bests].reverse().slice(0, 6).map((b, i) => (
              <li key={b.id} className="flex items-center gap-3 text-sm">
                <Trophy className={`h-4 w-4 ${i === 0 ? "text-accent-300" : "text-chalk/40"}`} aria-hidden="true" />
                <Link href={`/reports/${b.id}`} className="flex-1 text-white hover:underline">{b.touches} touches</Link>
                <span className="font-mono text-xs text-chalk/50">{shortDate(b.date)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      {p.assessments.length > 0 && (
        <Panel hud="Tests" title="Test scores over time" className="mt-4">
          <ul className="grid gap-2 sm:grid-cols-3">
            {p.assessments.slice(-9).reverse().map((a, i) => (
              <li key={i} className="flex items-center justify-between rounded-2xl border border-white/[0.06] px-4 py-3 text-sm">
                <span className="text-chalk/80">{TEST_LABEL[a.kind]}</span>
                <span className="font-mono text-white">{a.score}</span>
                <span className="font-mono text-xs text-chalk/50">{shortDate(a.date)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
