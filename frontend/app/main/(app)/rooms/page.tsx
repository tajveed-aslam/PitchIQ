"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, GraduationCap, KeyRound, Loader2, Plus, Shield, Users } from "lucide-react";
import { ErrorNote, Loading, PageHeader, Panel } from "@/components/main/ui";
import { api } from "@/lib/api";
import type { RoomBrief } from "@/lib/main";

function JoinForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function join(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "");
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ id: number }>("/rooms/join", { method: "POST", json: { code } });
      router.push(`/rooms/${r.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <Panel hud="Player" title="Join a room" testId="join-room">
      <form onSubmit={join} className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1"><span className="sr-only">Join code</span>
          <input name="code" required minLength={4} maxLength={12} placeholder="Code from your coach, e.g. RIVER16" autoCapitalize="characters" className="m-input font-mono uppercase tracking-widest" data-testid="join-code" />
        </label>
        <button type="submit" disabled={busy} className="btn-primary" data-testid="join-submit">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />} Join</button>
      </form>
      <p className="mt-3 text-xs text-chalk/50">Joining shares your card and reports with that room&apos;s coach. You can leave any time.</p>
      <ErrorNote message={error} />
    </Panel>
  );
}

function CreateForm() {
  const router = useRouter();
  const [kind, setKind] = useState<"team" | "academy">("team");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ id: number }>("/rooms", { method: "POST", json: {
        name: f.get("name"), kind, description: f.get("description") || null,
        min_touches: kind === "academy" && f.get("min_touches") ? Number(f.get("min_touches")) : null,
      } });
      router.push(`/rooms/${r.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <Panel hud="Coach" title="Create a room" testId="create-room">
      <form onSubmit={create} className="space-y-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Room type">
          {([["team", "Team squad", Shield], ["academy", "Academy trial", GraduationCap]] as const).map(([k, label, Icon]) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${kind === k ? "border-accent-400/60 bg-accent-400/10 text-white" : "border-white/10 text-chalk/70"}`}>
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
        <input name="name" required minLength={2} maxLength={80} placeholder={kind === "team" ? "Room name, e.g. Riverside U16" : "Trial name, e.g. 2027 intake"} className="m-input" data-testid="room-name" />
        <input name="description" maxLength={300} placeholder="Short description (optional)" className="m-input" />
        {kind === "academy" && <input name="min_touches" type="number" min={1} max={500} placeholder="Bar: touches in one video (e.g. 25)" className="m-input" data-testid="room-bar" />}
        <ErrorNote message={error} />
        <button type="submit" disabled={busy} className="btn-primary" data-testid="create-submit">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />} Create room</button>
      </form>
    </Panel>
  );
}

export default function Rooms() {
  const [data, setData] = useState<{ rooms: RoomBrief[]; can_create: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ rooms: RoomBrief[]; can_create: boolean }>("/rooms").then(setData).catch((e) => setError(e.message));
  }, []);
  if (error) return <ErrorNote message={error} />;
  if (!data) return <Loading label="Loading rooms" />;
  const coaching = data.rooms.filter((r) => r.role === "coach");
  const member = data.rooms.filter((r) => r.role === "player");

  return (
    <>
      <PageHeader eyebrow="Team" title="Rooms" sub="Squads and academy trials: tasks with deadlines, coach feedback, team leaderboards." />
      {data.rooms.length > 0 && (
        <div className="mb-6 grid gap-3 md:grid-cols-2" data-testid="room-list">
          {[...coaching, ...member].map((r) => (
            <Link key={r.id} href={`/rooms/${r.id}`} className="glass glass-hover group relative overflow-hidden p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="hud">{r.role === "coach" ? "You coach" : `Coach: ${r.coach}`} · {r.kind === "academy" ? "academy trial" : "team"}</p>
                  <p className="mt-1.5 font-display text-xl font-semibold text-white">{r.name}</p>
                  {r.description && <p className="mt-1 line-clamp-2 text-sm text-chalk/60">{r.description}</p>}
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-chalk/40 transition group-hover:translate-x-1 group-hover:text-accent-300" aria-hidden="true" />
              </div>
              <p className="mt-4 flex gap-4 text-sm text-chalk/70">
                <span><Users className="mr-1 inline h-4 w-4" aria-hidden="true" />{r.players} player{r.players === 1 ? "" : "s"}</span>
                <span>{r.tasks} task{r.tasks === 1 ? "" : "s"}</span>
                {r.open_tasks ? <span className="text-accent-200">{r.open_tasks} to hand in</span> : null}
              </p>
            </Link>
          ))}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <JoinForm />
        {data.can_create ? <CreateForm /> : (
          <section className="relative isolate overflow-hidden rounded-3xl border border-white/[0.08] p-6">
            <Image src="/images/main/trick-closeup-sm.webp" alt="" fill sizes="50vw" className="-z-20 object-cover opacity-30" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 to-ink-950/60" />
            <p className="hud">Coaches</p>
            <p className="mt-1 font-display text-xl font-semibold text-white">Run your own squad</p>
            <p className="mt-2 max-w-sm text-sm text-chalk/70">The Coach plan adds rooms, tasks with deadlines, scoring and a team dashboard.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/settings#plan" className="btn-primary !py-2">Coach plan</Link>
              <Link href="/login?demo=coach" className="btn-secondary !py-2">See the demo coach</Link>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
