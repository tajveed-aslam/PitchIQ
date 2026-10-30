"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Medal, Trophy } from "lucide-react";
import { Loading } from "@/components/app/Bits";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";

interface Board {
  title: string;
  rules: string;
  ends: string;
  leaderboard: { rank: number; name: string; country: string | null; touches: number; is_you: boolean }[];
  can_enter: boolean;
  logged_in: boolean;
}

const MEDAL = ["text-yellow-300", "text-slate-200", "text-amber-600"];

export default function EventsPage() {
  const { loading } = useSession();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    api<Board>("/events/current").then(setBoard).catch((e) => setError(e.message));
  }, [loading]);

  const daysLeft = board ? Math.max(0, Math.ceil((new Date(board.ends).getTime() - Date.now()) / 86_400_000)) : null;
  return (
    <>
      <section className="relative isolate overflow-hidden pb-12 pt-32">
        <Image src="/images/high-kick.webp" alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-950/40 via-ink-950/75 to-ink-950" />
        <div className="container-page">
          <p className="eyebrow">Monthly challenge</p>
          <h1 className="heading mt-2 sm:text-6xl">{board?.title ?? "Touch Challenge"}</h1>
          {board && <p className="mt-3 max-w-2xl text-chalk/80">{board.rules}</p>}
          {daysLeft != null && <p className="chip mt-4 w-fit">{daysLeft} days left</p>}
        </div>
      </section>
      <div className="container-page grid gap-8 pb-20 lg:grid-cols-[1.4fr_1fr]">
        <div className="card overflow-hidden">
          {error && <p className="p-6 text-flare">{error}</p>}
          {!board && !error && <Loading label="Loading the leaderboard" />}
          {board && (
            <table className="w-full text-left" data-testid="leaderboard">
              <caption className="sr-only">Leaderboard</caption>
              <thead className="bg-ink-900 text-xs uppercase tracking-wider text-chalk/60">
                <tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Player</th><th className="hidden px-4 py-3 sm:table-cell">Country</th><th className="px-4 py-3 text-right">Touches</th></tr>
              </thead>
              <tbody>
                {board.leaderboard.map((r) => (
                  <tr key={r.rank} className={`border-t border-white/5 ${r.is_you ? "bg-pitch-400/10" : ""}`}>
                    <td className="px-4 py-3 font-display text-xl font-bold text-white">
                      {r.rank <= 3 ? <Medal className={`h-5 w-5 ${MEDAL[r.rank - 1]}`} aria-label={`Rank ${r.rank}`} /> : r.rank}
                    </td>
                    <td className="px-4 py-3 text-white">{r.name}{r.is_you && <span className="chip ml-2 text-pitch-300">You</span>}</td>
                    <td className="hidden px-4 py-3 text-chalk/70 sm:table-cell">{r.country ?? "–"}</td>
                    <td className="px-4 py-3 text-right font-display text-2xl font-extrabold text-white">{r.touches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <aside className="card h-fit space-y-4 p-6">
          <Trophy className="h-8 w-8 text-pitch-400" aria-hidden="true" />
          {board?.can_enter ? (
            <>
              <p className="text-white">You&apos;re in. Your best accepted video this month counts automatically.</p>
              <Link href="/upload" className="btn-primary">Upload an attempt</Link>
            </>
          ) : board?.logged_in ? (
            <>
              <p className="text-white">Your plan doesn&apos;t include challenges.</p>
              <p className="text-sm text-chalk/70">Switch to the Events plan (test mode) to get your score on the board.</p>
              <Link href="/profile#plan" className="btn-primary">See plans</Link>
            </>
          ) : (
            <>
              <p className="text-white">Think you can top the board?</p>
              <p className="text-sm text-chalk/70">Sign up, film a session, and your best count this month goes on the board.</p>
              <Link href="/signup?plan=events" className="btn-primary">Join the challenge</Link>
            </>
          )}
          <p className="text-xs text-chalk/50">Leaderboard players are fictional sample players.</p>
        </aside>
      </div>
    </>
  );
}
