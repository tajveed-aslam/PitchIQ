"use client";

import Image from "next/image";
import { ArrowRight, BarChart3, ClipboardList, IdCard, Repeat2, Trophy, Users } from "lucide-react";
import { chooseRegion } from "@/lib/edition";

// What the Global (Main) edition adds, from the product brief. Shown on every Global page until it's built.
const COMING = [
  { icon: IdCard, title: "Full player card", text: "Physical, skill and mindset ratings, with a self-assessment questionnaire." },
  { icon: Repeat2, title: "Compare sessions", text: "Two attempts side by side: what changed, touch by touch." },
  { icon: BarChart3, title: "Progress analytics", text: "Charts for every metric over weeks and months." },
  { icon: ClipboardList, title: "AI training plans", text: "A weekly plan built from your weakest numbers." },
  { icon: Users, title: "Coach rooms", text: "Squads, join codes, tasks with deadlines and a team dashboard." },
  { icon: Trophy, title: "Challenges & badges", text: "Events, milestones and leaderboards across regions." },
];

export function MainComingSoon() {
  return (
    <section className="relative isolate overflow-hidden" data-testid="main-coming-soon">
      <Image src="/images/hero-bicycle.webp" alt="A player attempts a bicycle kick under floodlights" fill priority sizes="100vw"
        className="-z-30 object-cover object-[60%_center] opacity-50" />
      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-ink-950/60 via-ink-950/85 to-ink-950" />
      <div className="absolute -top-40 left-1/2 -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-glow/25 blur-3xl" aria-hidden="true" />
      <div className="absolute right-[-10%] top-1/3 -z-10 h-[360px] w-[360px] rounded-full bg-accent-400/20 blur-3xl" aria-hidden="true" />

      <div className="container-page pb-24 pt-36 text-center">
        <span className="chip mx-auto border-accent-400/30 bg-accent-400/10 text-accent-200">PitchIQ Global · next release</span>
        <h1 className="heading mx-auto mt-6 max-w-3xl text-5xl sm:text-7xl">
          The full platform is <span className="text-gradient">coming soon</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-chalk/80">
          The Global edition builds on the same touch-counting AI with deeper analytics and tools for coaches. Until it
          launches, PitchIQ Lite (Africa) is fully working: real video analysis, AI coaching, plans and challenges.
        </p>
        <button type="button" onClick={() => chooseRegion("africa")} className="btn-primary mt-8" data-testid="switch-to-africa">
          Try PitchIQ now (Africa edition) <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="mt-16 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
          {COMING.map((c) => (
            <article key={c.title} className="card p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-300/25 to-glow/25">
                <c.icon className="h-5 w-5 text-accent-300" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold text-white">{c.title}</h2>
              <p className="mt-1 text-sm text-chalk/75">{c.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
