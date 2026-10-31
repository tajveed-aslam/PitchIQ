"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BrainCircuit, Puzzle, Timer } from "lucide-react";
import { ErrorNote, Loading, PageHeader, Panel } from "@/components/main/ui";
import { api } from "@/lib/api";
import { TEST_LABEL } from "@/lib/main";

interface Taken { id: number; kind: string; score: number; detail: Record<string, unknown>; created_at: string }

const TESTS = [
  { kind: "mindset", href: "/assess/mindset", icon: BrainCircuit, title: "Mindset", time: "3 min",
    text: "12 statements about how you train and play: motivation, confidence, team spirit, leadership, communication, emotional control.",
    img: "/images/main/thigh-control-sm.webp", alt: "A player controls the ball on her thigh" },
  { kind: "reaction", href: "/assess/reaction", icon: Timer, title: "Reaction", time: "1 min",
    text: "Tap the moment the panel turns gold, five times. We score your median, so one slow tap doesn't count against you.",
    img: "/images/main/night-kick-sm.webp", alt: "A player volleys the ball under floodlights" },
  { kind: "logic", href: "/assess/logic", icon: Puzzle, title: "Logic", time: "4 min",
    text: "8 pattern puzzles: spot the rule, pick the next number. Graded on our server, so the answers never reach your browser.",
    img: "/images/main/feet-closeup-sm.webp", alt: "Close-up of feet juggling a ball on artificial grass" },
];

function detailText(t: Taken): string {
  const d = t.detail as { median_ms?: number; correct?: number; total?: number };
  if (t.kind === "reaction") return `${d.median_ms} ms median`;
  if (t.kind === "logic") return `${d.correct}/${d.total} right`;
  return `score ${t.score}`;
}

export default function Tests() {
  const [taken, setTaken] = useState<Taken[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Taken[]>("/player/assessments").then(setTaken).catch((e) => setError(e.message));
  }, []);
  if (error) return <ErrorNote message={error} />;
  if (!taken) return <Loading label="Loading your tests" />;
  const last = (kind: string) => taken.find((t) => t.kind === kind);

  return (
    <>
      <PageHeader eyebrow="Tests" title="Beyond the ball" sub="Three short tests that complete your player card. Retake them any time; the card uses the latest." />
      <div className="grid gap-4 md:grid-cols-3">
        {TESTS.map((t) => {
          const l = last(t.kind);
          return (
            <Link key={t.kind} href={t.href} className="group relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden rounded-3xl border border-white/[0.08]" data-testid={`test-${t.kind}`}>
              <Image src={t.img} alt={t.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="-z-20 object-cover opacity-60 transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/20" />
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <t.icon className="h-6 w-6 text-accent-300" aria-hidden="true" />
                  <span className="chip">{t.time}</span>
                </div>
                <h2 className="mt-3 font-display text-2xl font-semibold text-white">{t.title}</h2>
                <p className="mt-2 text-sm text-chalk/75">{t.text}</p>
                <p className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-chalk/60">{l ? `Last: ${detailText(l)}` : "Not taken yet"}</span>
                  <span className="inline-flex items-center gap-1 font-medium text-accent-200 group-hover:text-white">{l ? "Retake" : "Start"} <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
                </p>
              </div>
            </Link>
          );
        })}
      </div>
      {taken.length > 0 && (
        <Panel hud="History" title="Your results" className="mt-6">
          <ul className="divide-y divide-white/[0.06]">
            {taken.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="text-white">{TEST_LABEL[t.kind]}</span>
                <span className="text-chalk/70">{detailText(t)}</span>
                <span className="font-mono text-xs text-chalk/50">{new Date(t.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
