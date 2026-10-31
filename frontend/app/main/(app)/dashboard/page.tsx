"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BrainCircuit, CalendarCheck2, ClipboardList, IdCard, Medal, Ruler, Timer, Upload } from "lucide-react";
import { LineChart } from "@/components/main/charts";
import { ReportTile } from "@/components/main/ReportTile";
import { Empty, ErrorNote, Loading, Meter, PageHeader, Panel, Ring, Stat } from "@/components/main/ui";
import { api, type Dashboard } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { dueLabel, shortDate, type Overview, type Progress } from "@/lib/main";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const NEXT_STEPS: { key: keyof Overview["card"]["sections"]; text: string; href: string; icon: typeof IdCard }[] = [
  { key: "skills", text: "Analyse your first video to get skill ratings", href: "/upload", icon: Upload },
  { key: "physical", text: "Add height, weight and birth year to your card", href: "/card#physical", icon: Ruler },
  { key: "mindset", text: "Take the mindset self-assessment (3 min)", href: "/assess/mindset", icon: BrainCircuit },
  { key: "reaction", text: "Take the reaction test (1 min)", href: "/assess/reaction", icon: Timer },
  { key: "logic", text: "Solve the logic puzzles (4 min)", href: "/assess/logic", icon: BrainCircuit },
];

export default function CommandCentre() {
  const { user } = useSession();
  const [d, setD] = useState<Dashboard | null>(null);
  const [o, setO] = useState<Overview | null>(null);
  const [p, setP] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<Dashboard>("/me/dashboard"), api<Overview>("/player/overview"), api<Progress>("/insights/progress")])
      .then(([a, b, c]) => { setD(a); setO(b); setP(c); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!d || !o || !user) return <Loading label="Loading your command centre" />;

  const card = o.card;
  const todo = NEXT_STEPS.filter((s) => !card.sections[s.key]);
  const points = p && !p.locked ? p.points.slice(-12) : [];

  return (
    <>
      <PageHeader eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        title={<>{greeting()}, {user.name.split(" ")[0]}</>}
        sub={d.stats.analyses ? `${d.stats.analyses} analysed sessions · best ${d.stats.best} touches` : "Let's measure your first session."}
        action={<Link href="/upload" className="btn-primary"><Upload className="h-4 w-4" aria-hidden="true" /> Analyse a video</Link>} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Player overview: photo-backed hero panel */}
        <section className="relative isolate overflow-hidden rounded-3xl border border-white/[0.08] lg:col-span-2" data-testid="overview-card">
          <Image src="/images/main/hero-trick-sm.webp" alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" className="-z-20 object-cover object-[30%_center] opacity-30" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-900 via-ink-900/90 to-ink-900/50" />
          <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
            <Ring value={card.overall ?? 0} size={150} label="Overall rating">
              <span className="figure text-5xl" data-testid="overall">{card.overall ?? "–"}</span>
              <span className="hud !text-[10px]">overall</span>
            </Ring>
            <div className="space-y-4">
              <div>
                <p className="hud">Player card · {card.complete}% complete</p>
                <p className="mt-1 font-display text-2xl font-semibold text-white">{card.physical.position ?? "Player"}{card.physical.shirt_number ? ` · #${card.physical.shirt_number}` : ""}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {card.skills.filter((s) => s.measured_by === "video").map((s) => <Meter key={s.key} label={s.label} value={s.value} />)}
              </div>
              {card.readiness && (
                <p className="text-sm text-chalk/70">
                  Competition readiness <span className="font-mono font-semibold text-white">{card.readiness.value}</span>
                  <span className="text-chalk/50"> · from {card.readiness.parts.filter((x) => x.value != null).map((x) => x.label.toLowerCase()).join(", ")}</span>
                </p>
              )}
              <Link href="/card" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-200 hover:text-white">Open full card <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <Panel hud="This week" title="Training" testId="week-panel">
          {o.training ? (
            <div className="flex items-center gap-5">
              <Ring value={(100 * o.training.done) / Math.max(1, o.training.total)} size={96} stroke={8} label="Training sessions done">
                <span className="figure text-xl">{o.training.done}/{o.training.total}</span>
              </Ring>
              <div className="space-y-1 text-sm">
                <p className="text-chalk/80">Sessions ticked off</p>
                <p className="text-chalk/60">Goal: <span className="font-semibold text-white">{o.training.goal_touches} touches</span></p>
                <Link href="/training" className="inline-flex items-center gap-1 text-accent-200 hover:text-white">Open plan <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-chalk/70">
              <p>No plan yet. A week of drills built from your numbers.</p>
              <Link href="/training" className="btn-secondary !py-2"><CalendarCheck2 className="h-4 w-4" aria-hidden="true" /> Build my week</Link>
            </div>
          )}
          <p className="mt-5 border-t border-white/[0.06] pt-4 text-sm text-chalk/70">
            <span className="font-mono font-semibold text-white">{o.week.sessions}</span> analysed session{o.week.sessions === 1 ? "" : "s"} in the last 7 days
          </p>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Best" value={d.stats.best} unit="touches" testId="stat-best" />
        <Stat label="Last session" value={d.stats.last} unit="touches" delta={d.stats.change} hint="vs the one before" />
        <Stat label="Analyses left" value={d.allowance.remaining} hint={`of ${d.allowance.limit} this ${d.allowance.period === "trial" ? "trial" : d.allowance.period === "today" ? "day" : "month"}`} />
        <Stat label="Badges" value={o.badges.earned} hint={`of ${o.badges.total}`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel hud="Touches per session" title="Progress" className="lg:col-span-2"
          action={<Link href="/progress" className="text-sm text-accent-200 hover:text-white">Analytics</Link>}>
          {p?.locked ? (
            <p className="text-sm text-chalk/70">Progress analytics come with Skill Analysis, AI Coach and Coach. <Link href="/settings#plan" className="text-white underline-offset-4 hover:underline">See plans</Link></p>
          ) : points.length > 1 ? (
            <LineChart ariaLabel="Touches in each of your recent sessions" testId="dash-chart"
              series={[{ name: "Touches", color: "series-1", points: points.map((x, i) => ({ x: i, y: x.touches, label: x.title, band: x.range })) }]}
              xLabel={(i) => (points[i] ? shortDate(points[i].date) : "")} height={220} />
          ) : (
            <Empty icon={Upload} title="Two sessions make a line" text="Analyse another video to start your progress chart." />
          )}
        </Panel>

        <div className="space-y-4">
          <Panel hud="From your coach" title="Tasks" testId="tasks-panel">
            {o.tasks.length ? (
              <ul className="space-y-2">
                {o.tasks.map((t) => (
                  <li key={t.id}>
                    <Link href={`/rooms/${t.room_id}`} className="flex items-start gap-3 rounded-2xl border border-white/[0.06] p-3 hover:bg-white/5">
                      <ClipboardList className={`mt-0.5 h-4 w-4 ${t.overdue ? "text-flare" : "text-accent-300"}`} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-white">{t.title}</span>
                        <span className={`text-xs ${t.overdue ? "text-flare" : t.due_soon ? "text-accent-200" : "text-chalk/60"}`}>{t.room} · {dueLabel(t.due_at)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-chalk/60">No open tasks. Join your coach&apos;s room with a code on <Link href="/rooms" className="text-white underline-offset-4 hover:underline">Rooms</Link>.</p>}
          </Panel>
          {todo.length > 0 && (
            <Panel hud="Complete your card" testId="next-steps">
              <ul className="space-y-1">
                {todo.slice(0, 3).map((s) => (
                  <li key={s.key}>
                    <Link href={s.href} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-chalk/85 hover:bg-white/5 hover:text-white">
                      <s.icon className="h-4 w-4 text-accent-300" aria-hidden="true" /> {s.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel hud="Latest" title="Reports" className="lg:col-span-2" action={<Link href="/reports" className="text-sm text-accent-200 hover:text-white">All reports</Link>}>
          {d.recent.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{d.recent.map((a) => <ReportTile key={a.id} a={a} compact />)}</div>
          ) : <Empty icon={Upload} title="No reports yet" text="Upload a juggling video or try a sample." action={<Link href="/upload" className="btn-primary">Analyse a video</Link>} />}
        </Panel>
        <Panel hud="Recently earned" title="Badges" action={<Link href="/challenges#badges" className="text-sm text-accent-200 hover:text-white">All</Link>}>
          {o.badges.latest.length ? (
            <ul className="space-y-3">
              {o.badges.latest.map((b) => (
                <li key={b.code} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-300/30 to-glow/30"><Medal className="h-5 w-5 text-accent-200" aria-hidden="true" /></span>
                  <span><span className="block text-sm font-medium text-white">{b.name}</span><span className="text-xs text-chalk/60">{b.text}</span></span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-chalk/60">Your first analysed video earns “First touch”.</p>}
        </Panel>
      </div>
    </>
  );
}
