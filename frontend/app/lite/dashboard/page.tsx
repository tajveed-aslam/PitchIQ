"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, CloudUpload, Lock, PlayCircle, Trophy, TrendingUp } from "lucide-react";
import { Loading, PageShell, PlayerCard, ReportTile, Sparkline } from "@/components/app/Bits";
import { api, type Dashboard } from "@/lib/api";
import { useRequireUser } from "@/lib/auth";

interface Progress {
  locked: boolean;
  points: { date: string; touches: number | null }[];
}

export default function DashboardPage() {
  const { user } = useRequireUser();
  const [data, setData] = useState<Dashboard | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api<Dashboard>("/me/dashboard").then(setData).catch((e) => setError(e.message));
    api<Progress>("/analyses/progress").then(setProgress).catch(() => setProgress(null));
  }, [user]);

  if (!user || (!data && !error)) return <Loading label="Loading your dashboard" />;
  if (error || !data) return <PageShell title="Dashboard"><p className="text-flare">{error}</p></PageShell>;

  const { allowance, stats } = data;
  const first = user.name.split(" ")[0];
  return (
    <PageShell eyebrow={user.is_guest ? "Demo account" : "Dashboard"} title={`Hi, ${first}`}
      action={<Link href="/upload" className="btn-primary"><CloudUpload className="h-5 w-5" aria-hidden="true" /> Upload a session</Link>}>
      {user.is_guest && (
        <p className="mb-6 rounded-xl border border-accent-400/30 bg-accent-400/10 px-4 py-3 text-sm text-chalk">
          You&apos;re exploring the shared demo player. Uploads work; anything you add is cleared after a day.{" "}
          <Link href="/signup" className="font-semibold text-accent-300 underline">Create your own account</Link>
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <PlayerCard data={data} />
          <div className="card space-y-3 p-5" data-testid="allowance">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-white">{allowance.plan_name}</span>
              <Link href="/profile#plan" className="text-accent-300 hover:underline">Change plan</Link>
            </div>
            <div className="h-2 rounded-full bg-ink-950">
              <div className="h-2 rounded-full bg-accent-400" style={{ width: `${Math.min(100, (100 * allowance.used) / Math.max(1, allowance.limit))}%` }} />
            </div>
            <p className="text-sm text-chalk/70">
              {allowance.trial_expired ? "Your free trial has ended. Pick a plan to keep analysing." :
                `${allowance.remaining} of ${allowance.limit} analyses left ${allowance.period === "today" ? "today" : allowance.period === "trial" ? "in your trial" : "this month"}.`}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Sessions", value: stats.analyses },
              { label: "Best", value: stats.best ?? "–" },
              { label: "Last", value: stats.last ?? "–", sub: stats.change != null ? `${stats.change >= 0 ? "+" : ""}${stats.change} vs before` : undefined },
            ].map((s) => (
              <div key={s.label} className="card p-4">
                <p className="text-xs uppercase tracking-wider text-chalk/60">{s.label}</p>
                <p className="font-display text-4xl font-extrabold text-white">{s.value}</p>
                {s.sub && <p className={`text-xs ${stats.change! >= 0 ? "text-accent-300" : "text-flare"}`}>{s.sub}</p>}
              </div>
            ))}
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2 font-semibold text-white"><TrendingUp className="h-5 w-5 text-accent-400" aria-hidden="true" /> Progress</div>
            {progress?.locked ? (
              <p className="flex items-center gap-2 text-sm text-chalk/70"><Lock className="h-4 w-4" aria-hidden="true" /> Progress tracking comes with Skill Analysis and AI Coach. <Link href="/profile#plan" className="text-accent-300 underline">See plans</Link></p>
            ) : progress ? <Sparkline points={progress.points} /> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/upload" className="group relative isolate flex min-h-28 items-end overflow-hidden rounded-2xl p-4">
              <Image src="/images/knee-volley-sm.webp" alt="" fill sizes="300px" className="-z-20 object-cover transition group-hover:scale-105" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 to-ink-950/20" />
              <span className="flex items-center gap-2 font-display text-xl font-bold uppercase text-white"><CloudUpload className="h-5 w-5 text-accent-400" aria-hidden="true" /> Analyse a new session</span>
            </Link>
            <Link href="/events" className="group relative isolate flex min-h-28 items-end overflow-hidden rounded-2xl p-4">
              <Image src="/images/high-kick-sm.webp" alt="" fill sizes="300px" className="-z-20 object-cover transition group-hover:scale-105" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 to-ink-950/20" />
              <span className="flex items-center gap-2 font-display text-xl font-bold uppercase text-white"><Trophy className="h-5 w-5 text-accent-400" aria-hidden="true" /> Monthly challenge</span>
            </Link>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold uppercase text-white">Recent reports</h2>
              <Link href="/reports" className="text-sm text-accent-300 hover:underline">All reports</Link>
            </div>
            {data.recent.length ? (
              <div className="grid gap-3 sm:grid-cols-2">{data.recent.map((a) => <ReportTile key={a.id} a={a} />)}</div>
            ) : (
              <div className="card flex flex-col items-center gap-3 p-8 text-center">
                <p className="text-chalk/75">No sessions yet. Upload one, or run a sample to see a report.</p>
                <Link href="/samples" className="btn-secondary"><PlayCircle className="h-5 w-5" aria-hidden="true" /> Try a sample</Link>
              </div>
            )}
          </div>

          {data.notifications.length > 0 && (
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2 font-semibold text-white"><Bell className="h-5 w-5 text-accent-400" aria-hidden="true" /> Notifications</div>
              <ul className="space-y-2">
                {data.notifications.map((n) => (
                  <li key={n.id} className="text-sm text-chalk/85">
                    {n.link ? <Link href={n.link} className="hover:text-white">{n.text}</Link> : n.text}
                    <span className="ml-2 text-xs text-chalk/60">{new Date(n.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
