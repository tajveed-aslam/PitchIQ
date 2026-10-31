"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Check, Globe2, Loader2, ShieldCheck } from "lucide-react";
import { ErrorNote, Loading, PageHeader, Panel } from "@/components/main/ui";
import { EDITIONS } from "@/config/editions";
import { api, type Allowance } from "@/lib/api";
import { useSession } from "@/lib/auth";
import type { Physical } from "@/lib/main";

const PREFS: { key: keyof Physical["prefs"]; label: string; text: string }[] = [
  { key: "tasks", label: "Coach tasks", text: "New tasks, reminders two days before a deadline, and coach scores." },
  { key: "reports", label: "Reports", text: "When an analysis is ready or a video needs re-filming." },
  { key: "badges", label: "Badges", text: "When you earn a badge." },
];

export default function Settings() {
  const { user, allowance, refresh } = useSession();
  const [phys, setPhys] = useState<Physical | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    api<Physical>("/player/profile").then(setPhys).catch((e) => setError(e.message));
  }, []);
  if (!user || !allowance || !phys) return error ? <ErrorNote message={error} /> : <Loading label="Loading settings" />;

  async function savePref(key: keyof Physical["prefs"], on: boolean) {
    const prefs = { ...phys!.prefs, [key]: on };
    setPhys({ ...phys!, prefs });
    try {
      await api("/player/profile", { method: "PUT", json: { prefs } });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function saveAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy("account");
    setError(null);
    try {
      await api("/me", { method: "PATCH", json: { name: f.get("name"), favourite_team: f.get("favourite_team") || null } });
      await refresh();
      setSaved("account");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function choose(plan: string) {
    setBusy(plan);
    setError(null);
    try {
      await api<Allowance>("/me/plan", { method: "POST", json: { plan } });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Settings" title="Account and preferences" />
      <ErrorNote message={error} />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel hud="Account" title={user.email}>
          {user.is_guest ? <p className="text-sm text-chalk/70">This is a shared demo account, so it can&apos;t be changed. <Link href="/signup" className="text-white underline-offset-4 hover:underline">Create your own</Link> to keep your data.</p> : (
            <form onSubmit={saveAccount} className="space-y-3">
              <label className="block space-y-1 text-sm"><span className="text-chalk/70">Name</span><input name="name" required maxLength={80} defaultValue={user.name} className="m-input" /></label>
              <label className="block space-y-1 text-sm"><span className="text-chalk/70">Favourite team</span><input name="favourite_team" maxLength={60} defaultValue={user.favourite_team ?? ""} className="m-input" /></label>
              <button type="submit" disabled={busy !== null} className="btn-secondary !py-2">{busy === "account" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : saved === "account" ? <Check className="h-4 w-4" aria-hidden="true" /> : null} Save</button>
            </form>
          )}
          <p className="mt-4 text-xs text-chalk/50">Physical profile and position are on your <Link href="/card#physical" className="underline-offset-4 hover:underline">player card</Link>.</p>
        </Panel>

        <Panel hud="Notifications" title={<span className="flex items-center gap-2"><Bell className="h-5 w-5 text-accent-300" aria-hidden="true" /> What we tell you about</span>} testId="prefs">
          <ul className="space-y-3">
            {PREFS.map((p) => {
              const on = phys.prefs[p.key] !== false;
              return (
                <li key={p.key} className="flex items-start justify-between gap-4">
                  <span><span className="block text-sm font-medium text-white">{p.label}</span><span className="text-xs text-chalk/60">{p.text}</span></span>
                  <button type="button" role="switch" aria-checked={on} aria-label={p.label} disabled={user.is_guest} onClick={() => savePref(p.key, !on)} data-testid={`pref-${p.key}`}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${on ? "bg-accent-400" : "bg-white/15"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel hud="Language and region" title={<span className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-accent-300" aria-hidden="true" /> English · Global</span>}>
          <label className="block space-y-1 text-sm"><span className="text-chalk/70">Language</span>
            <select className="m-input" defaultValue="en" aria-describedby="lang-note"><option value="en">English</option></select></label>
          <p id="lang-note" className="mt-2 text-xs text-chalk/50">More languages are on the roadmap. The region switch (Africa / Global) is in the menu.</p>
        </Panel>

        <Panel hud="Privacy" title={<span className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-accent-300" aria-hidden="true" /> Your data</span>}>
          <ul className="space-y-2 text-sm text-chalk/75">
            <li>Videos are deleted as soon as they&apos;re analysed; we keep a thumbnail and the report.</li>
            <li>Joining a room shares your card and reports with that room&apos;s coach only. Leave the room to stop sharing.</li>
            <li>The mindset test is your own view of yourself; nobody else sees the answers, only the trait scores.</li>
          </ul>
        </Panel>
      </div>

      <section id="plan" className="mt-8 scroll-mt-24">
        <p className="hud">Plan · test mode, nothing is charged</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-white">You&apos;re on {allowance.plan_name}</h2>
        {user.is_guest && <p className="mt-2 text-sm text-chalk/60">The demo account&apos;s plan can&apos;t be changed.</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EDITIONS.main.plans.map((p) => {
            const current = allowance.plan === p.id;
            return (
              <article key={p.id} className={`glass flex flex-col p-5 ${current ? "border-accent-400/50 shadow-glow" : ""}`} data-testid={`settings-plan-${p.id}`}>
                <p className="flex items-center justify-between font-display text-lg font-semibold text-white">{p.name}{current && <span className="chip !text-accent-200">Current</span>}</p>
                <p className="mt-1"><span className="figure text-2xl">{p.price}</span> <span className="text-xs text-chalk/60">{p.period}</span></p>
                <ul className="mt-3 flex-1 space-y-1 text-xs text-chalk/70">{p.features.map((f) => <li key={f}>· {f}</li>)}</ul>
                {p.comingSoon ? <Link href="/support#contact" className="btn-secondary mt-4 !py-2">Talk to us</Link> : (
                  <button type="button" onClick={() => choose(p.id)} disabled={current || user.is_guest || busy !== null} className="btn-secondary mt-4 !py-2 disabled:opacity-50" data-testid={`choose-${p.id}`}>
                    {busy === p.id && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{current ? "Current plan" : `Switch to ${p.name}`}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
