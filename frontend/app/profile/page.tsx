"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Loading, PageShell } from "@/components/app/Bits";
import { Field, FormError, inputCls } from "@/components/AuthLayout";
import { EDITION } from "@/config/editions";
import { api, type User } from "@/lib/api";
import { useRequireUser } from "@/lib/auth";

const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"];
const FEET = ["Right", "Left", "Both"];

function ProfileInner() {
  const { user, allowance, refresh } = useRequireUser();
  const welcome = useSearchParams().get("welcome");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  if (!user || !allowance) return <Loading />;
  const readOnly = user.is_guest;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => (f.get(k) as string)?.trim() || null;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api<User>("/me", {
        method: "PATCH",
        json: { name: text("name") ?? user!.name, age: text("age") ? Number(text("age")) : null, position: text("position"),
          favourite_team: text("favourite_team"), country: text("country"), preferred_foot: text("preferred_foot") },
      });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function choose(plan: string) {
    setSwitching(plan);
    setError(null);
    try {
      await api("/me/plan", { method: "POST", json: { plan } });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSwitching(null);
    }
  }

  return (
    <PageShell eyebrow="Profile" title={welcome ? "Tell us about you" : "Your profile"}>
      {welcome && <p className="mb-6 rounded-xl border border-pitch-400/30 bg-pitch-400/10 px-4 py-3 text-chalk">Welcome! These details go on your player card and help the coach tailor drills. All optional.</p>}
      {readOnly && <p className="mb-6 text-sm text-chalk/70">This is the shared demo profile, so it can&apos;t be edited.</p>}
      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={save} className="card space-y-4 p-5 sm:p-6" data-testid="profile-form">
          <Field label="Name"><input name="name" defaultValue={user.name} required maxLength={80} disabled={readOnly} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Age"><input name="age" type="number" min={5} max={80} defaultValue={user.age ?? ""} disabled={readOnly} className={inputCls} data-testid="profile-age" /></Field>
            <Field label="Position">
              <select name="position" defaultValue={user.position ?? ""} disabled={readOnly} className={inputCls} data-testid="profile-position">
                <option value="">—</option>{POSITIONS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Favourite team"><input name="favourite_team" defaultValue={user.favourite_team ?? ""} maxLength={60} disabled={readOnly} className={inputCls} /></Field>
            <Field label="Country"><input name="country" defaultValue={user.country ?? ""} maxLength={60} disabled={readOnly} className={inputCls} /></Field>
          </div>
          <Field label="Stronger foot">
            <select name="preferred_foot" defaultValue={user.preferred_foot ?? ""} disabled={readOnly} className={inputCls}>
              <option value="">—</option>{FEET.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <FormError message={error} />
          {!readOnly && (
            <button type="submit" disabled={saving} className="btn-primary" data-testid="profile-save">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : saved ? <Check className="h-5 w-5" aria-hidden="true" /> : null}
              {saved ? "Saved" : "Save profile"}
            </button>
          )}
        </form>

        <section id="plan" className="scroll-mt-24 space-y-4">
          <h2 className="font-display text-3xl font-bold uppercase text-white">Plan</h2>
          <p className="text-sm text-chalk/70">Test mode: switching is instant and nothing is charged.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {EDITION.plans.map((p) => {
              const current = allowance.plan === p.id;
              return (
                <div key={p.id} className={`card flex flex-col p-4 ${current ? "border-pitch-400/70 shadow-glow" : ""}`} data-testid={`plan-${p.id}`}>
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-xl font-bold uppercase text-white">{p.name}</h3>
                    <span className="text-sm text-chalk/70">{p.price} {p.period}</span>
                  </div>
                  <ul className="mt-2 flex-1 space-y-1 text-sm text-chalk/80">{p.features.map((f) => <li key={f}>• {f}</li>)}</ul>
                  {current ? (
                    <span className="mt-3 text-sm font-semibold text-pitch-300">Current plan{allowance.trial_expired ? " (ended)" : ""}</span>
                  ) : (
                    <button type="button" onClick={() => choose(p.id)} disabled={readOnly || switching !== null} className="btn-secondary mt-3 !py-2 disabled:opacity-50">
                      {switching === p.id && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Switch
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export default function ProfilePage() {
  return <Suspense fallback={<Loading />}><ProfileInner /></Suspense>;
}
