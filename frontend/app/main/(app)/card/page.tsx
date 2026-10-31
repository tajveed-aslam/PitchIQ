"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrainCircuit, Check, Loader2, Puzzle, Timer, Upload } from "lucide-react";
import { GoldCard } from "@/components/main/PlayerCard";
import { ErrorNote, Loading, Meter, PageHeader, Panel, btnSm } from "@/components/main/ui";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";
import type { FullCard, Physical } from "@/lib/main";

function PhysicalForm({ card, onSaved }: { card: FullCard; onSaved: () => void }) {
  const { user, refresh } = useSession();
  const [phys, setPhys] = useState<Physical | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Physical>("/player/profile").then(setPhys).catch((e) => setError(e.message));
  }, []);
  if (!phys || !user) return <Loading label="Loading" />;
  const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number(v));

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api("/player/profile", { method: "PUT", json: {
        height_cm: num(f.get("height_cm")), weight_kg: num(f.get("weight_kg")), birth_year: num(f.get("birth_year")),
        body_type: f.get("body_type") || null, shirt_number: num(f.get("shirt_number")),
      } });
      await api("/me", { method: "PATCH", json: {
        position: f.get("position") || null, preferred_foot: f.get("preferred_foot") || null, country: f.get("country") || null,
      } });
      await refresh();
      setSaved(true);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const field = "space-y-1.5 text-sm";
  return (
    <form onSubmit={save} className="space-y-5" data-testid="physical-form">
      {user.is_guest && <p className="text-sm text-chalk/60">The demo profile is shared, so it can&apos;t be edited. Sign up to make your own card.</p>}
      <fieldset disabled={user.is_guest || busy} className="grid gap-4 sm:grid-cols-3">
        <label className={field}><span className="text-chalk/80">Height (cm)</span><input name="height_cm" type="number" min={100} max={230} defaultValue={phys.height_cm ?? ""} className="m-input" data-testid="height" /></label>
        <label className={field}><span className="text-chalk/80">Weight (kg)</span><input name="weight_kg" type="number" min={20} max={150} defaultValue={phys.weight_kg ?? ""} className="m-input" /></label>
        <label className={field}><span className="text-chalk/80">Birth year</span><input name="birth_year" type="number" min={1940} max={2022} defaultValue={phys.birth_year ?? ""} className="m-input" /></label>
        <label className={field}><span className="text-chalk/80">Body type</span>
          <select name="body_type" defaultValue={phys.body_type ?? ""} className="m-input"><option value="">–</option>{["Slim", "Athletic", "Stocky"].map((b) => <option key={b}>{b}</option>)}</select></label>
        <label className={field}><span className="text-chalk/80">Position</span>
          <select name="position" defaultValue={card.physical.position ?? ""} className="m-input"><option value="">–</option>{["Goalkeeper", "Defender", "Midfielder", "Forward"].map((b) => <option key={b}>{b}</option>)}</select></label>
        <label className={field}><span className="text-chalk/80">Stronger foot</span>
          <select name="preferred_foot" defaultValue={card.physical.preferred_foot ?? ""} className="m-input"><option value="">–</option>{["Left", "Right", "Both"].map((b) => <option key={b}>{b}</option>)}</select></label>
        <label className={field}><span className="text-chalk/80">Shirt number</span><input name="shirt_number" type="number" min={1} max={99} defaultValue={phys.shirt_number ?? ""} className="m-input" /></label>
        <label className={`${field} sm:col-span-2`}><span className="text-chalk/80">Country</span><input name="country" maxLength={60} defaultValue={user.country ?? ""} className="m-input" /></label>
      </fieldset>
      <ErrorNote message={error} />
      {!user.is_guest && (
        <button type="submit" disabled={busy} className="btn-primary" data-testid="save-physical">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : saved ? <Check className="h-4 w-4" aria-hidden="true" /> : null} {saved ? "Saved" : "Save profile"}
        </button>
      )}
    </form>
  );
}

function CardPage() {
  const { user } = useSession();
  const welcome = useSearchParams().get("welcome");
  const [card, setCard] = useState<FullCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => api<FullCard>("/player/card").then(setCard).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!card || !user) return <Loading label="Building your card" />;

  const skills = card.skills;
  return (
    <>
      <PageHeader eyebrow="Player card" title={user.name} sub={welcome ? "Welcome! Fill in your card: each part you add makes it more complete." : `${card.complete}% complete · ${card.sessions} analysed session${card.sessions === 1 ? "" : "s"}`} />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <GoldCard card={card} name={user.name} />
          <Panel hud="Card complete">
            <div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-gradient-to-r from-accent-400 to-glow" style={{ width: `${card.complete}%` }} /></div>
            <ul className="mt-4 space-y-1.5 text-sm">
              {(Object.entries(card.sections) as [string, boolean][]).map(([k, ok]) => (
                <li key={k} className="flex items-center gap-2 capitalize">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full ${ok ? "bg-good/20 text-good" : "bg-white/5 text-chalk/40"}`}>{ok ? <Check className="h-3 w-3" aria-hidden="true" /> : "·"}</span>
                  <span className={ok ? "text-white" : "text-chalk/60"}>{k}</span>
                  <span className="sr-only">{ok ? "done" : "not done"}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel hud="Measured from your videos" title="Skills" testId="skills-panel"
            action={<Link href="/upload" className={btnSm}><Upload className="h-4 w-4" aria-hidden="true" /> Analyse</Link>}>
            <div className="grid gap-4 sm:grid-cols-2">
              {skills.map((s) => <Meter key={s.key} label={s.label} value={s.value} sub={s.measured_by ? undefined : "Our video analysis doesn't measure this yet"} />)}
            </div>
            <p className="mt-5 text-xs text-chalk/50">Overall = the average of the measured skills ({skills.filter((s) => s.value != null).length} of {skills.length}). Ratings use your best count and your last five sessions.</p>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel hud="Self-assessment" title="Mindset" testId="mindset-panel"
              action={<Link href="/assess/mindset" className={btnSm}><BrainCircuit className="h-4 w-4" aria-hidden="true" /> {card.mindset.score != null ? "Retake" : "Take"}</Link>}>
              <div className="space-y-3">{card.mindset.traits.map((t) => <Meter key={t.key} label={t.label} value={t.value} />)}</div>
              <p className="mt-4 text-xs text-chalk/50">Your own view of yourself, from 12 statements. Not a psychological test.</p>
            </Panel>
            <Panel hud="Tests" title="Speed of thought">
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm text-chalk/85"><Timer className="h-4 w-4 text-accent-300" aria-hidden="true" /> Reaction</p>
                    <Link href="/assess/reaction" className="text-xs text-accent-200 hover:text-white">{card.reaction ? "Retake" : "Take"}</Link>
                  </div>
                  {card.reaction ? (
                    <p className="mt-2"><span className="figure text-3xl">{card.reaction.median_ms}</span> <span className="text-sm text-chalk/60">ms median · rating {card.reaction.rating}</span></p>
                  ) : <p className="mt-2 text-sm text-chalk/50">Not taken yet.</p>}
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm text-chalk/85"><Puzzle className="h-4 w-4 text-accent-300" aria-hidden="true" /> Logic</p>
                    <Link href="/assess/logic" className="text-xs text-accent-200 hover:text-white">{card.logic ? "Retake" : "Take"}</Link>
                  </div>
                  {card.logic ? (
                    <p className="mt-2"><span className="figure text-3xl">{card.logic.correct}/{card.logic.total}</span> <span className="text-sm text-chalk/60">puzzles · {Math.round(card.logic.seconds)} s</span></p>
                  ) : <p className="mt-2 text-sm text-chalk/50">Not taken yet.</p>}
                </div>
                {card.readiness && (
                  <div className="border-t border-white/[0.06] pt-4">
                    <p className="hud">Competition readiness</p>
                    <p className="mt-1"><span className="figure text-3xl">{card.readiness.value}</span></p>
                    <p className="mt-1 text-xs text-chalk/50">Average of {card.readiness.parts.map((p) => `${p.label.toLowerCase()} ${p.value ?? "–"}`).join(", ")}.</p>
                  </div>
                )}
              </div>
            </Panel>
          </div>

          <Panel id="physical" hud="Profile" title="Physical and position">
            <PhysicalForm card={card} onSaved={load} />
          </Panel>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return <Suspense fallback={<Loading />}><CardPage /></Suspense>;
}
