// Main (Global) landing page sections. Image-led: every section carries a real photo (stills from the licensed
// Mixkit clips, see docs/CREDITS.md). Numbers shown are real: the sample clip's stored report and the accuracy
// measured on hand-counted clips (docs/MODEL_ACCURACY.md).
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, BadgeCheck, BrainCircuit, CalendarCheck2, Camera, ChartLine, Check, Gauge, IdCard, PlayCircle, Repeat2,
  ShieldCheck, Sparkles, Timer, Trophy, Users,
} from "lucide-react";
import { EDITIONS } from "@/config/editions";
import { rhythmLabel, controlLabel, SAMPLES } from "@/lib/samples";

const showcase = SAMPLES.find((s) => s.id === "juggling-43487") ?? SAMPLES[0];
const m = showcase.report.metrics;

/** The hero photo with a tracking overlay: a reticle locked on the ball, the ball's arc and live telemetry. */
function TrackingPhoto() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-accent-400/20 via-transparent to-glow/30 blur-2xl" aria-hidden="true" />
      <figure className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl sm:aspect-[16/10]">
        <Image src="/images/main/hero-trick.webp" alt="A player sitting on a garage floor keeps a football in the air with his feet" fill priority
          sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-[35%_center]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-ink-950/10" />
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden="true" />
        {/* scanner line */}
        <div className="absolute inset-x-0 top-0 h-[10%] animate-sweep bg-gradient-to-b from-transparent via-accent-300/25 to-transparent" aria-hidden="true" />
        {/* the ball's measured arc and the reticle (ball centre in this frame: 25.8% across, 43% down) */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M8 92 Q 18 20 26 43" fill="none" stroke="rgb(var(--accent-300))" strokeWidth=".5" strokeDasharray="1.2 1.2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="absolute left-[25.8%] top-[43%] h-[34%] w-[25%] -translate-x-1/2 -translate-y-1/2 animate-lock" aria-hidden="true">
          <span className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-accent-300" />
          <span className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-accent-300" />
          <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-accent-300" />
          <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-accent-300" />
          <span className="hud absolute -top-6 left-0 whitespace-nowrap !text-[10px] text-accent-200">ball · locked</span>
        </div>
        <figcaption className="absolute inset-x-3 bottom-3 grid grid-cols-3 gap-2 sm:inset-x-4 sm:bottom-4">
          {[
            ["Touches", `${m.touches}`, `likely ${m.touches_range[0]}–${m.touches_range[1]}`],
            ["Rhythm", rhythmLabel(m.interval_s?.cv), `${m.interval_s?.mean.toFixed(2)} s apart`],
            ["Control", controlLabel(m.arc_height_balls?.mean), `${m.arc_height_balls?.mean.toFixed(1)} ball heights`],
          ].map(([k, v, s]) => (
            <div key={k} className="rounded-2xl border border-white/10 bg-ink-950/70 p-2.5 backdrop-blur-md sm:p-3">
              <p className="hud !text-[9px] sm:!text-[10px]">{k}</p>
              <p className="mt-1 truncate font-display text-base font-semibold text-white sm:text-xl">{v}</p>
              <p className="truncate text-[10px] text-chalk/60 sm:text-xs">{s}</p>
            </div>
          ))}
        </figcaption>
      </figure>
      <div className="glass absolute -right-2 -top-6 hidden w-44 p-4 shadow-2xl sm:block lg:-right-6" aria-hidden="true">
        <p className="hud !text-[10px]">Example player card</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="figure text-5xl leading-none text-gradient">78</span>
          <span className="pb-1 text-xs text-chalk/60">overall</span>
        </div>
        <div className="mt-3 space-y-1.5 text-[11px]">
          {[["TCH", 87], ["RHY", 77], ["CTL", 72]].map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-7 font-mono text-chalk/60">{k}</span>
              <span className="h-1 flex-1 rounded-full bg-white/10"><span className="block h-1 rounded-full bg-accent-400" style={{ width: `${v}%` }} /></span>
              <span className="w-5 text-right font-mono text-white">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const e = EDITIONS.main;
  return (
    <section className="relative isolate overflow-hidden pb-20 pt-28 sm:pt-36" data-testid="main-hero">
      <div className="grid-bg absolute inset-0 -z-20 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden="true" />
      <div className="absolute -top-40 left-[-10%] -z-10 h-[520px] w-[620px] rounded-full bg-glow/20 blur-3xl" aria-hidden="true" />
      <div className="absolute right-[-10%] top-20 -z-10 h-[420px] w-[420px] rounded-full bg-accent-400/10 blur-3xl" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.15fr]">
        <div className="animate-rise space-y-7">
          <span className="chip border-accent-400/25 bg-accent-400/10 text-accent-200"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Computer vision · AI coaching · team tools</span>
          <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
            {e.hero.title} <span className="text-gradient">{e.hero.accent}</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-chalk/75">{e.hero.body}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/samples" className="btn-primary !px-6 !py-3.5"><PlayCircle className="h-5 w-5" aria-hidden="true" /> Analyse a sample</Link>
            <Link href="/signup" className="btn-secondary !px-6 !py-3.5">Start free <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <p className="text-sm text-chalk/60">
            Or look around first: <Link href="/login?demo=player" className="text-white underline-offset-4 hover:underline">demo player</Link> ·{" "}
            <Link href="/login?demo=coach" className="text-white underline-offset-4 hover:underline">demo coach</Link>
          </p>
        </div>
        <TrackingPhoto />
      </div>
    </section>
  );
}

export function ProofStrip() {
  const items = [
    { k: "90%", v: "of touches found on hand-counted clips" },
    { k: "±3", v: "touches, with the true count inside the range" },
    { k: "0", v: "videos kept: deleted right after analysis" },
    { k: "3", v: "checks on every AI reply before you see it" },
  ];
  return (
    <section aria-label="Measured accuracy" className="border-y border-white/[0.06] bg-ink-900/40">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.v}>
            <p className="figure text-4xl text-gradient">{i.k}</p>
            <p className="mt-1 text-sm text-chalk/70">{i.v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHead({ hud, title, sub, center = false }: { hud: string; title: React.ReactNode; sub?: string; center?: boolean }) {
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      <p className="hud text-accent-300">{hud}</p>
      <h2 className="mt-3 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-lg text-chalk/70">{sub}</p>}
    </div>
  );
}

function PhotoTile({ src, alt, pos = "center", children, className = "" }: { src: string; alt: string; pos?: string; children: React.ReactNode; className?: string }) {
  return (
    <article className={`group relative isolate overflow-hidden rounded-[1.75rem] border border-white/[0.08] ${className}`}>
      <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 40vw, 100vw" className="-z-20 object-cover transition duration-700 group-hover:scale-[1.04]" style={{ objectPosition: pos }} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/75 to-ink-950/10" />
      <div className="flex h-full flex-col justify-end p-6">{children}</div>
    </article>
  );
}

export function Platform() {
  return (
    <section id="platform" className="scroll-mt-24 py-24">
      <div className="mx-auto max-w-6xl space-y-12 px-4 sm:px-6">
        <SectionHead hud="The platform" title={<>Everything on your card <span className="text-gradient">was measured.</span></>}
          sub="Video analysis, tests and training in one place. Where we can't measure something yet, the card says so instead of guessing." />
        <div className="grid auto-rows-[minmax(280px,auto)] gap-4 md:grid-cols-6">
          <PhotoTile src="/images/main/thigh-control.webp" alt="Close-up of a player controlling the ball on her thigh" className="md:col-span-4 md:row-span-2" pos="50% 40%">
            <IdCard className="h-6 w-6 text-accent-300" aria-hidden="true" />
            <h3 className="mt-3 font-display text-2xl font-semibold text-white">The full player card</h3>
            <p className="mt-2 max-w-md text-chalk/75">Skill ratings from your videos, physical profile, a mindset self-assessment and reaction and logic tests. One overall rating, built only from what was measured.</p>
            <div className="mt-6 grid max-w-md grid-cols-3 gap-2">
              {[["Skills", "video"], ["Mindset", "12 statements"], ["Reaction", "tap test"]].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-white/10 bg-ink-950/60 p-3 backdrop-blur"><p className="text-sm font-semibold text-white">{k}</p><p className="text-xs text-chalk/60">{v}</p></div>
              ))}
            </div>
          </PhotoTile>
          <article className="glass flex flex-col justify-between p-6 md:col-span-2">
            <Repeat2 className="h-6 w-6 text-accent-300" aria-hidden="true" />
            <div>
              <h3 className="font-display text-xl font-semibold text-white">Compare two sessions</h3>
              <p className="mt-2 text-sm text-chalk/70">Touches, pace, rhythm and control side by side, with the gap between every touch drawn for both.</p>
              <svg viewBox="0 0 200 50" className="mt-4 w-full" aria-hidden="true">
                <path d="M0 35 L20 30 L40 38 L60 25 L80 33 L100 28 L120 36 L140 26 L160 31 L180 29 L200 33" fill="none" stroke="rgb(var(--series-2))" strokeWidth="2" />
                <path d="M0 26 L20 24 L40 27 L60 23 L80 25 L100 24 L120 26 L140 23 L160 24 L180 23 L200 24" fill="none" stroke="rgb(var(--series-1))" strokeWidth="2" />
              </svg>
            </div>
          </article>
          <article className="glass flex flex-col justify-between p-6 md:col-span-2">
            <ChartLine className="h-6 w-6 text-accent-300" aria-hidden="true" />
            <div>
              <h3 className="font-display text-xl font-semibold text-white">Progress analytics</h3>
              <p className="mt-2 text-sm text-chalk/70">Every metric over weeks, personal bests, and a trend line fitted to your own sessions.</p>
              <div className="mt-4 flex h-14 items-end gap-1.5" aria-hidden="true">
                {[11, 14, 13, 18, 21, 24, 23, 29].map((v, i) => <span key={i} className="flex-1 rounded-t bg-gradient-to-t from-accent-600/60 to-accent-300" style={{ height: `${(v / 29) * 100}%` }} />)}
              </div>
            </div>
          </article>
          <PhotoTile src="/images/main/knee-touch-sm.webp" alt="A player in a green top juggles the ball on her knee" className="md:col-span-3" pos="50% 30%">
            <CalendarCheck2 className="h-6 w-6 text-accent-300" aria-hidden="true" />
            <h3 className="mt-3 font-display text-xl font-semibold text-white">AI training plans</h3>
            <p className="mt-2 text-sm text-chalk/75">A week built from your weakest numbers: five training days, two rest days, drills from a vetted library only.</p>
          </PhotoTile>
          <PhotoTile src="/images/main/neon-dribble.webp" alt="Close-up of feet dribbling a ball on artificial grass in front of a neon wall" className="md:col-span-3" pos="40% 60%">
            <Trophy className="h-6 w-6 text-accent-300" aria-hidden="true" />
            <h3 className="mt-3 font-display text-xl font-semibold text-white">Challenges and badges</h3>
            <p className="mt-2 text-sm text-chalk/75">Monthly touch challenge, team leaderboards and badges for real milestones, like your first 40-touch run.</p>
          </PhotoTile>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { icon: Camera, t: "Measure", d: "Our own computer-vision pipeline tracks the ball frame by frame, rebuilds hidden moments from its flight path and counts every touch, with a likely range." },
    { icon: ShieldCheck, t: "Check", d: "A quality gate rejects videos it can't trust (moving camera, ball lost) instead of guessing. Rejected videos don't use your allowance." },
    { icon: BrainCircuit, t: "Coach", d: "Gemini writes the feedback from the measured numbers only. Replies that invent a number, contradict the measurement or name an unknown drill are replaced." },
  ];
  return (
    <section className="relative isolate overflow-hidden py-24">
      <Image src="/images/main/night-kick.webp" alt="" fill sizes="100vw" className="-z-20 object-cover object-[60%_center] opacity-35" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-950 via-ink-950/80 to-ink-950" />
      <div className="mx-auto max-w-6xl space-y-12 px-4 sm:px-6">
        <SectionHead hud="How the AI works" title={<>Numbers first. <span className="text-gradient">Words second.</span></>} />
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.t} className="glass p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-300/25 to-glow/25"><s.icon className="h-5 w-5 text-accent-200" aria-hidden="true" /></span>
                <span className="font-mono text-sm text-chalk/40">0{i + 1}</span>
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-white">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-chalk/70">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Coaches() {
  const feats = [
    { icon: Users, t: "Rooms for squads and trials", d: "Team rooms, or academy trials where applicants are checked against your bar." },
    { icon: Timer, t: "Tasks with deadlines", d: "Set a video task, a touch target and a date. Players get reminders." },
    { icon: BadgeCheck, t: "Score every hand-in", d: "Watch the report, score it out of 100 and leave a note." },
    { icon: Gauge, t: "A team dashboard that talks", d: "Weekly averages, who's gone quiet, overdue tasks: flagged for you." },
  ];
  return (
    <section id="coaches" className="scroll-mt-24 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div className="relative order-last lg:order-first">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-white/10">
            <Image src="/images/main/trick-closeup.webp" alt="A player sitting on the floor juggles the ball in front of his face" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-[45%_center]" />
            <div className="absolute inset-0 bg-gradient-to-tr from-ink-950/70 to-transparent" />
          </div>
          <div className="glass absolute -bottom-8 right-4 w-64 p-4 shadow-2xl sm:right-8" aria-hidden="true">
            <p className="hud !text-[10px]">Riverside U16 · team average</p>
            <div className="mt-3 flex h-16 items-end gap-2">
              {[15, 17, 16, 20, 22, 24].map((v, i) => <span key={i} className={`flex-1 rounded-t ${i === 5 ? "bg-accent-400" : "bg-accent-400/35"}`} style={{ height: `${(v / 24) * 100}%` }} />)}
            </div>
            <p className="mt-2 text-xs text-good">▲ Team average rose from 22 to 24</p>
          </div>
        </div>
        <div className="space-y-8">
          <SectionHead hud="For coaches and academies" title={<>Run your squad from <span className="text-gradient">one room.</span></>}
            sub="Players join with a code that expires. You see their cards and reports; they see their tasks and the leaderboard." />
          <ul className="grid gap-5 sm:grid-cols-2">
            {feats.map((f) => (
              <li key={f.t}>
                <f.icon className="h-5 w-5 text-accent-300" aria-hidden="true" />
                <p className="mt-2 font-semibold text-white">{f.t}</p>
                <p className="mt-1 text-sm text-chalk/70">{f.d}</p>
              </li>
            ))}
          </ul>
          <Link href="/login?demo=coach" className="btn-primary" data-testid="try-demo-coach">Open the demo coach <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}

export function Pricing() {
  const plans = EDITIONS.main.plans;
  return (
    <section id="pricing" className="scroll-mt-24 py-24">
      <div className="mx-auto max-w-6xl space-y-12 px-4 sm:px-6">
        <SectionHead center hud="Pricing" title={<>Start free. <span className="text-gradient">Upgrade when it helps.</span></>} sub="Test mode: choosing a plan switches it instantly and nothing is charged." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <article key={p.id} className={`glass relative flex flex-col p-6 ${p.highlight ? "border-accent-400/40 shadow-glow" : ""}`} data-testid={`plan-${p.id}`}>
              {p.highlight && <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-accent-300 to-accent-500 px-3 py-1 text-xs font-semibold text-ink-950">Most popular</span>}
              <h3 className="font-display text-xl font-semibold text-white">{p.name}</h3>
              <p className="mt-1 text-sm text-chalk/60">{p.blurb}</p>
              <p className="mt-5 flex items-baseline gap-1.5"><span className="figure text-4xl">{p.price}</span><span className="text-sm text-chalk/60">{p.period}</span></p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-chalk/85">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" aria-hidden="true" />{f}</li>)}
              </ul>
              {p.comingSoon ? (
                <Link href="/support#contact" className="btn-secondary mt-6">Talk to us</Link>
              ) : (
                <Link href={`/signup?plan=${p.id}`} className={`${p.highlight ? "btn-primary" : "btn-secondary"} mt-6`}>Choose {p.name}</Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Voices() {
  const quotes = [
    { q: "The card finally shows my rhythm, not just a count. Two weeks of metronome touches and it went from uneven to steady.", who: "M.R.", role: "Midfielder, 15" },
    { q: "Setting one task for the whole squad and seeing who handed in by Friday saves me an evening a week.", who: "J.K.", role: "U16 coach" },
    { q: "I like that it says 'not measured' for dribbling instead of making up a number.", who: "A.O.", role: "Parent" },
  ];
  return (
    <section className="py-16">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-3">
        {quotes.map((t) => (
          <figure key={t.who} className="glass p-6">
            <blockquote className="text-chalk/85">“{t.q}”</blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-300/25 to-glow/30 font-display text-sm font-semibold text-white" aria-hidden="true">{t.who.replace(/\./g, "")}</span>
              <span className="text-sm"><span className="block text-white">{t.who}</span><span className="text-chalk/60">{t.role} · Sample</span></span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-white/10 px-6 py-16 text-center sm:py-24">
        <Image src="/images/main/feet-closeup.webp" alt="" fill sizes="100vw" className="-z-20 object-cover object-[50%_35%] opacity-40" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-ink-950/95 via-ink-950/80 to-glow/30" />
        <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">Your next session, <span className="text-gradient">measured.</span></h2>
        <p className="mx-auto mt-4 max-w-xl text-chalk/75">Three free analyses with AI coaching. No card needed.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="btn-primary !px-6 !py-3.5">Start free</Link>
          <Link href="/samples" className="btn-secondary !px-6 !py-3.5">Try a sample first</Link>
        </div>
      </div>
    </section>
  );
}
