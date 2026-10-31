"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BrainCircuit, Calendar, Check, CheckCircle2, Flame, Medal, PlayCircle, Puzzle, Rocket, TrendingUp, Trophy, Users, Zap,
  type LucideIcon,
} from "lucide-react";
import { ErrorNote, Loading, PageHeader, Panel } from "@/components/main/ui";
import { api } from "@/lib/api";
import type { BadgeInfo } from "@/lib/main";

interface Challenge {
  title: string; rules: string; ends: string; can_enter: boolean; logged_in: boolean;
  leaderboard: { rank: number; name: string; country: string | null; touches: number; is_you: boolean }[];
}

const ICONS: Record<string, LucideIcon> = {
  play: PlayCircle, flame: Flame, rocket: Rocket, trending: TrendingUp, calendar: Calendar, brain: BrainCircuit,
  zap: Zap, puzzle: Puzzle, users: Users, check: CheckCircle2, medal: Medal,
};

export default function Challenges() {
  const [ch, setCh] = useState<Challenge | null>(null);
  const [badges, setBadges] = useState<BadgeInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([api<Challenge>("/events/current"), api<BadgeInfo[]>("/player/badges")])
      .then(([c, b]) => { setCh(c); setBadges(b); }).catch((e) => setError(e.message));
  }, []);
  if (error) return <ErrorNote message={error} />;
  if (!ch || !badges) return <Loading label="Loading challenges" />;
  const daysLeft = Math.max(0, Math.ceil((new Date(ch.ends).getTime() - Date.now()) / 86_400_000));
  const earned = badges.filter((b) => b.earned_at).length;

  return (
    <>
      <PageHeader eyebrow="Compete" title="Challenges and badges" />
      <section className="relative isolate overflow-hidden rounded-3xl border border-white/[0.08]" data-testid="challenge">
        <Image src="/images/main/neon-dribble.webp" alt="Feet dribbling a ball in front of a neon-lit wall" fill sizes="100vw" className="-z-20 object-cover object-[40%_60%] opacity-50" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/40" />
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            <span className="chip border-accent-400/30 bg-accent-400/10 text-accent-200"><Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Live · {daysLeft} day{daysLeft === 1 ? "" : "s"} left</span>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">{ch.title}</h2>
            <p className="text-chalk/75">{ch.rules}</p>
            {ch.can_enter ? (
              <Link href="/upload" className="btn-primary">Post a score</Link>
            ) : (
              <p className="text-sm text-chalk/70">Your plan doesn&apos;t include challenges. <Link href="/settings#plan" className="text-white underline-offset-4 hover:underline">Events or Coach plan</Link> to enter.</p>
            )}
          </div>
          <ol className="glass divide-y divide-white/[0.06] !rounded-2xl p-2" aria-label="Leaderboard">
            {ch.leaderboard.slice(0, 8).map((r) => (
              <li key={r.rank} className={`flex items-center gap-3 px-3 py-2.5 text-sm ${r.is_you ? "rounded-xl bg-accent-400/10" : ""}`}>
                <span className={`w-6 text-center font-mono ${r.rank <= 3 ? "text-accent-300" : "text-chalk/50"}`}>{r.rank}</span>
                <span className="flex-1 text-white">{r.name}{r.is_you && <span className="ml-2 text-xs text-accent-200">you</span>}</span>
                <span className="text-xs text-chalk/50">{r.country}</span>
                <span className="w-10 text-right font-mono font-semibold text-white">{r.touches}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Panel hud="Your squad" title="Team leaderboards">
          <p className="text-sm text-chalk/70">Each coach&apos;s room has its own weekly and monthly leaderboard and team milestones, like 500 touches together in a month.</p>
          <Link href="/rooms" className="btn-secondary mt-4 !py-2"><Users className="h-4 w-4" aria-hidden="true" /> Open rooms</Link>
        </Panel>
        <Panel hud="Academy trials" title="Get scouted">
          <p className="text-sm text-chalk/70">Academies run open trials as rooms with a bar, say 25 touches in one video. Join with the trial&apos;s code and your best count is checked against it.</p>
          <Link href="/rooms" className="btn-secondary mt-4 !py-2">Enter a trial code</Link>
        </Panel>
      </div>

      <Panel id="badges" hud={`${earned} of ${badges.length} earned`} title="Badges" className="mt-4 scroll-mt-24" testId="badges">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {badges.map((b) => {
            const Icon = ICONS[b.icon] ?? Medal;
            const on = !!b.earned_at;
            return (
              <li key={b.code} className={`relative rounded-2xl border p-4 ${on ? "border-accent-400/30 bg-gradient-to-br from-accent-400/10 to-glow/10" : "border-white/[0.06] opacity-60"}`} data-testid={`badge-${b.code}`} data-earned={on}>
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${on ? "bg-gradient-to-br from-accent-300 to-accent-500 text-ink-950" : "bg-white/5 text-chalk/40"}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <p className="mt-3 text-sm font-semibold text-white">{b.name}</p>
                <p className="mt-0.5 text-xs text-chalk/60">{b.text}</p>
                <p className="mt-2 text-[11px] text-chalk/50">{on ? <><Check className="mr-1 inline h-3 w-3 text-good" aria-hidden="true" />{new Date(b.earned_at!).toLocaleDateString()}</> : "Not yet"}</p>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
