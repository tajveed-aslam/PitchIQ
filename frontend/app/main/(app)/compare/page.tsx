"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, Repeat2 } from "lucide-react";
import { TouchTimeline } from "@/components/TouchTimeline";
import { LineChart } from "@/components/main/charts";
import { Empty, ErrorNote, Loading, PageHeader, Panel } from "@/components/main/ui";
import { api, thumbUrl, type AnalysisSummary } from "@/lib/api";
import type { CompareSide, Comparison } from "@/lib/main";

const LABEL: Record<string, string> = { touches: "Touches", per_minute: "Pace (per min)", rhythm_cv: "Rhythm spread", arc: "Ball height (ball sizes)", certain: "Seen clearly" };
const value = (s: CompareSide, k: string) => (s as unknown as Record<string, number | null>)[k];

function Side({ s, tag }: { s: CompareSide; tag: string }) {
  const thumb = thumbUrl(s);
  return (
    <div className="glass overflow-hidden">
      <div className="relative aspect-video bg-ink-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {thumb && <img src={thumb} alt="" className="h-full w-full object-cover opacity-75" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 to-transparent" />
        <span className="hud absolute left-4 top-4 rounded-full bg-ink-950/80 px-2.5 py-1 !text-white">{tag}</span>
        <p className="absolute bottom-3 left-4"><span className="figure text-5xl">{s.touches}</span> <span className="text-sm text-chalk/70">touches</span></p>
      </div>
      <div className="p-4">
        <Link href={`/reports/${s.id}`} className="font-medium text-white hover:underline">{s.title}</Link>
        <p className="text-xs text-chalk/50">{new Date(s.date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })} · rhythm {s.rhythm.toLowerCase()} · control {s.control.toLowerCase()}</p>
      </div>
    </div>
  );
}

function Picker({ reports, a, b }: { reports: AnalysisSummary[]; a?: string; b?: string }) {
  const router = useRouter();
  const [x, setX] = useState(a ?? (reports[1] ? String(reports[1].id) : ""));
  const [y, setY] = useState(b ?? (reports[0] ? String(reports[0].id) : ""));
  const opts = reports.map((r) => <option key={r.id} value={r.id}>{r.title} · {r.touches} · {new Date(r.created_at).toLocaleDateString()}</option>);
  return (
    <form className="glass mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); router.push(`/compare?a=${x}&b=${y}`); }}>
      <label className="flex-1 space-y-1 text-sm"><span className="text-chalk/70">Session A</span><select value={x} onChange={(e) => setX(e.target.value)} className="m-input" data-testid="compare-a">{opts}</select></label>
      <label className="flex-1 space-y-1 text-sm"><span className="text-chalk/70">Session B</span><select value={y} onChange={(e) => setY(e.target.value)} className="m-input" data-testid="compare-b">{opts}</select></label>
      <button type="submit" disabled={!x || !y || x === y} className="btn-primary disabled:opacity-50"><Repeat2 className="h-4 w-4" aria-hidden="true" /> Compare</button>
    </form>
  );
}

function Compare() {
  const params = useSearchParams();
  const a = params.get("a") ?? undefined, b = params.get("b") ?? undefined;
  const [reports, setReports] = useState<AnalysisSummary[] | null>(null);
  const [c, setC] = useState<Comparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AnalysisSummary[]>("/analyses").then((r) => setReports(r.filter((x) => x.status === "done"))).catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    setC(null);
    setError(null);
    if (a && b) api<Comparison>(`/insights/compare?a=${a}&b=${b}`).then(setC).catch((e) => setError(e.message));
  }, [a, b]);

  if (!reports) return error ? <ErrorNote message={error} /> : <Loading label="Loading your sessions" />;
  const header = <PageHeader eyebrow="Analysis" title="Compare sessions" sub="Two of your sessions side by side, earlier on the left." />;
  if (reports.length < 2) return <>{header}<Empty icon={Repeat2} title="You need two sessions" text="Analyse another video, then compare the two here." action={<Link href="/upload" className="btn-primary">Analyse a video</Link>} /></>;

  return (
    <>
      {header}
      <Picker key={`${a}-${b}`} reports={reports} a={a} b={b} />
      <ErrorNote message={error} />
      {a && b && !c && !error && <Loading label="Comparing" />}
      {c && (
        <div className="space-y-4" data-testid="comparison">
          <p className={`glass px-5 py-4 font-display text-xl font-semibold ${c.verdict === "improved" ? "text-good" : c.verdict === "dropped" ? "text-flare" : "text-white"}`} data-testid="verdict">
            {c.verdict === "improved" ? `▲ Up ${c.b.touches - c.a.touches} touches` : c.verdict === "dropped" ? `▼ Down ${c.a.touches - c.b.touches} touches` : "Same count"}
            <span className="ml-2 font-sans text-sm font-normal text-chalk/60">from session A to session B</span>
          </p>
          <div className="grid gap-4 md:grid-cols-2"><Side s={c.a} tag="A · earlier" /><Side s={c.b} tag="B · later" /></div>

          <Panel hud="What changed" title="Metric by metric">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-chalk/50"><th className="pb-2 font-normal">Metric</th><th className="pb-2 text-right font-normal">A</th><th className="pb-2 text-right font-normal">B</th><th className="pb-2 text-right font-normal">Change</th></tr></thead>
              <tbody>
                {c.changes.map((ch) => {
                  const good = ch.delta != null && ch.delta !== 0 && (ch.delta > 0) === (ch.better === "up");
                  const Icon = !ch.delta ? Minus : ch.delta > 0 ? ArrowUpRight : ArrowDownRight;
                  return (
                    <tr key={ch.key} className="border-t border-white/[0.06]">
                      <td className="py-2.5 text-chalk/85">{LABEL[ch.key]}{ch.better === "down" && <span className="ml-1 text-xs text-chalk/40">(lower is better)</span>}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-chalk/70">{value(c.a, ch.key) ?? "–"}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-white">{value(c.b, ch.key) ?? "–"}</td>
                      <td className={`py-2.5 text-right font-mono tabular-nums ${!ch.delta ? "text-chalk/50" : good ? "text-good" : "text-flare"}`}>
                        <Icon className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />{ch.delta == null ? "–" : `${ch.delta > 0 ? "+" : ""}${ch.delta}`}
                        <span className="sr-only">{ch.delta ? (good ? " better" : " worse") : ""}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          <Panel hud="Rhythm" title="Seconds between touches">
            <LineChart ariaLabel="Seconds between touches in session A and session B" testId="compare-chart" yUnit=" s"
              series={[
                { name: "A · earlier", color: "series-2", points: c.a.intervals.map((v, i) => ({ x: i + 1, y: v })) },
                { name: "B · later", color: "series-1", points: c.b.intervals.map((v, i) => ({ x: i + 1, y: v })) },
              ]}
              xLabel={(x) => `touch ${x}`} tableHeaders={["Touch", "A (s)", "B (s)"]} />
            <p className="mt-2 text-xs text-chalk/50">The flatter line has the more even rhythm.</p>
          </Panel>

          <Panel hud="Timelines" title="When each touch happened">
            <div className="space-y-5">
              <div><p className="mb-2 text-sm text-chalk/70">A · {c.a.title}</p><TouchTimeline duration={c.a.duration} ai={c.a.touch_times} /></div>
              <div><p className="mb-2 text-sm text-chalk/70">B · {c.b.title}</p><TouchTimeline duration={c.b.duration} ai={c.b.touch_times} /></div>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}

export default function Page() {
  return <Suspense fallback={<Loading />}><Compare /></Suspense>;
}
