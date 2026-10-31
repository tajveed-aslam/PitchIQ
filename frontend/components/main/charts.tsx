"use client";

// Small SVG charts for the Main edition, no chart library (keeps the bundle small).
// Specs (dataviz guidance): 2px lines, >= 8px end markers with a surface ring, hairline solid grid, one y-axis,
// series colours validated for colour-blind separation (--series-1 ochre, --series-2 violet), a legend only for
// two or more series, a crosshair + tooltip on hover/focus, and a table view so no value is hover-only.
import { useEffect, useId, useRef, useState } from "react";

function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceMax(v: number): number {
  if (v <= 0) return 10;
  const step = v <= 10 ? 2 : v <= 50 ? 10 : v <= 100 ? 20 : 50;
  return Math.ceil((v * 1.1) / step) * step;
}

export interface Series {
  name: string;
  color: "series-1" | "series-2";
  points: { x: number; y: number | null; label?: string; band?: [number, number] }[];
}

interface LineProps {
  series: Series[];
  height?: number;
  xLabel: (x: number) => string;
  yUnit?: string;
  trend?: { x: number; y: number }[]; // a derived straight line, drawn dashed in muted ink
  trendLabel?: string;
  ariaLabel: string;
  yMax?: number;
  tableHeaders?: [string, ...string[]];
  testId?: string;
}

export function LineChart({ series, height = 240, xLabel, yUnit = "", trend, trendLabel, ariaLabel, yMax, tableHeaders, testId }: LineProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const clip = useId();
  const pad = { l: 36, r: 16, t: 14, b: 28 };
  const xs = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.x)).concat(trend?.map((t) => t.x) ?? []))).sort((a, b) => a - b);
  if (!xs.length) return null;
  const ys = series.flatMap((s) => s.points.flatMap((p) => [p.y ?? 0, p.band?.[1] ?? 0])).concat(trend?.map((t) => t.y) ?? []);
  const top = yMax ?? niceMax(Math.max(...ys));
  const x0 = xs[0], x1 = xs[xs.length - 1] === x0 ? x0 + 1 : xs[xs.length - 1];
  const sx = (x: number) => pad.l + ((x - x0) / (x1 - x0)) * (width - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - y / top) * (height - pad.t - pad.b);
  const ticks = [0, top / 2, top];
  const dataXs = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.x)))).sort((a, b) => a - b);

  function nearest(px: number): number {
    let best = 0;
    dataXs.forEach((x, i) => { if (Math.abs(sx(x) - px) < Math.abs(sx(dataXs[best]) - px)) best = i; });
    return best;
  }
  const hx = hover != null ? dataXs[hover] : null;

  return (
    <div data-testid={testId}>
      {series.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-4 text-xs text-chalk/75" aria-label="Legend">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-2"><span className="h-0.5 w-4 rounded" style={{ background: `rgb(var(--${s.color}))` }} />{s.name}</li>
          ))}
          {trend && <li className="flex items-center gap-2"><span className="w-4 border-t border-dashed border-chalk/50" />{trendLabel ?? "Trend"}</li>}
        </ul>
      )}
      <div ref={ref} className="relative">
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block touch-none select-none"
          tabIndex={0}
          onPointerMove={(e) => setHover(nearest(e.clientX - e.currentTarget.getBoundingClientRect().left))}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover(dataXs.length - 1)} onBlur={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? 0) - 1));
            if (e.key === "ArrowRight") setHover((h) => Math.min(dataXs.length - 1, (h ?? -1) + 1));
          }}>
          <defs><clipPath id={clip}><rect x={pad.l} y={0} width={width - pad.l - pad.r + 8} height={height} /></clipPath></defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={sy(t)} y2={sy(t)} stroke="rgb(255 255 255 / .07)" strokeWidth={1} />
              <text x={pad.l - 8} y={sy(t) + 4} textAnchor="end" className="fill-chalk/50 font-mono text-[10px] tabular-nums">{Math.round(t)}</text>
            </g>
          ))}
          {[xs[0], xs[xs.length - 1]].map((x, i) => (
            <text key={i} x={sx(x)} y={height - 8} textAnchor={i ? "end" : "start"} className="fill-chalk/50 font-mono text-[10px]">{xLabel(x)}</text>
          ))}
          <g clipPath={`url(#${clip})`}>
            {series.map((s) => {
              const banded = s.points.filter((p) => p.band);
              return banded.length > 1 ? (
                <path key={s.name + "band"} fill={`rgb(var(--${s.color}) / .12)`}
                  d={`M${banded.map((p) => `${sx(p.x)},${sy(p.band![1])}`).join("L")}L${[...banded].reverse().map((p) => `${sx(p.x)},${sy(p.band![0])}`).join("L")}Z`} />
              ) : null;
            })}
            {trend && trend.length > 1 && (
              <path d={`M${trend.map((t) => `${sx(t.x)},${sy(t.y)}`).join("L")}`} fill="none" stroke="rgb(var(--chalk) / .45)" strokeWidth={1.5} strokeDasharray="5 5" />
            )}
            {series.map((s) => {
              const pts = s.points.filter((p) => p.y != null);
              return (
                <path key={s.name} d={`M${pts.map((p) => `${sx(p.x)},${sy(p.y!)}`).join("L")}`} fill="none"
                  stroke={`rgb(var(--${s.color}))`} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              );
            })}
          </g>
          {hx != null && <line x1={sx(hx)} x2={sx(hx)} y1={pad.t} y2={height - pad.b} stroke="rgb(255 255 255 / .25)" strokeWidth={1} />}
          {series.map((s) => {
            const pts = s.points.filter((p) => p.y != null);
            const last = pts[pts.length - 1];
            return (
              <g key={s.name + "dots"}>
                {pts.filter((p) => p.x === hx || p === last).map((p) => (
                  <circle key={p.x} cx={sx(p.x)} cy={sy(p.y!)} r={4.5} fill={`rgb(var(--${s.color}))`} stroke="rgb(var(--ink-900))" strokeWidth={2} />
                ))}
                {last && hx == null && series.length === 1 && (
                  <text x={sx(last.x) - 8} y={sy(last.y!) - 10} textAnchor="end" className="fill-white font-mono text-[11px] font-medium">{last.y}{yUnit}</text>
                )}
              </g>
            );
          })}
        </svg>
        {hx != null && (
          <div className="pointer-events-none absolute top-0 z-10 min-w-[8rem] rounded-xl border border-white/10 bg-ink-950/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
            style={{ left: Math.min(Math.max(sx(hx) - 64, 0), width - 150) }}>
            <p className="text-chalk/60">{xLabel(hx)}</p>
            {series.map((s) => {
              const p = s.points.find((q) => q.x === hx);
              return p && p.y != null ? (
                <p key={s.name} className="mt-1 flex items-center gap-2">
                  <span className="h-0.5 w-3 rounded" style={{ background: `rgb(var(--${s.color}))` }} />
                  <span className="font-mono text-sm font-semibold text-white">{p.y}{yUnit}</span>
                  <span className="text-chalk/60">{p.label ?? s.name}</span>
                </p>
              ) : null;
            })}
          </div>
        )}
      </div>
      {tableHeaders && (
        <>
          <button type="button" onClick={() => setTable((t) => !t)} className="mt-2 text-xs text-chalk/60 underline-offset-4 hover:text-white hover:underline">
            {table ? "Hide table" : "Show as table"}
          </button>
          {table && (
            <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-ink-900 text-chalk/60"><tr>{tableHeaders.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {dataXs.map((x) => (
                    <tr key={x} className="border-t border-white/5">
                      <td className="px-3 py-1.5 text-chalk/80">{xLabel(x)}</td>
                      {series.map((s) => <td key={s.name} className="px-3 py-1.5 font-mono tabular-nums text-white">{s.points.find((p) => p.x === x)?.y ?? "–"}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Columns from one baseline (sessions per week, team average per week). Each column is its own hover target. */
export function Columns({ data, height = 160, ariaLabel, unit = "", testId }: {
  data: { label: string; value: number | null; highlight?: boolean }[]; height?: number; ariaLabel: string; unit?: string; testId?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 8, r: 8, t: 18, b: 22 };
  const top = niceMax(Math.max(1, ...data.map((d) => d.value ?? 0)));
  const slot = (width - pad.l - pad.r) / data.length;
  const bw = Math.min(24, slot - 4);
  const sy = (v: number) => pad.t + (1 - v / top) * (height - pad.t - pad.b);
  return (
    <div ref={ref} className="relative" data-testid={testId}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block">
        <line x1={pad.l} x2={width - pad.r} y1={sy(0)} y2={sy(0)} stroke="rgb(255 255 255 / .1)" />
        {data.map((d, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const v = d.value ?? 0;
          const h = sy(0) - sy(v);
          const r = Math.min(4, h);
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}
              aria-label={`${d.label}: ${d.value ?? "no data"}${unit}`}>
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={height - pad.t - pad.b} fill="transparent" />
              {d.value != null && d.value > 0 && (
                <path fill={d.highlight ? "rgb(var(--accent-400))" : hover === i ? "rgb(var(--series-1) / .95)" : "rgb(var(--series-1) / .7)"}
                  d={`M${cx - bw / 2},${sy(0)}V${sy(v) + r}Q${cx - bw / 2},${sy(v)} ${cx - bw / 2 + r},${sy(v)}H${cx + bw / 2 - r}Q${cx + bw / 2},${sy(v)} ${cx + bw / 2},${sy(v) + r}V${sy(0)}Z`} />
              )}
              {(i === 0 || i === data.length - 1) && (
                <text x={cx} y={height - 6} textAnchor="middle" className="fill-chalk/50 font-mono text-[10px]">{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute top-0 z-10 rounded-xl border border-white/10 bg-ink-950/95 px-3 py-2 text-xs shadow-xl"
          style={{ left: Math.min(Math.max(pad.l + slot * hover - 30, 0), width - 120) }}>
          <span className="font-mono text-sm font-semibold text-white">{data[hover].value ?? "–"}{unit}</span>
          <span className="ml-2 text-chalk/60">{data[hover].label}</span>
        </div>
      )}
    </div>
  );
}
