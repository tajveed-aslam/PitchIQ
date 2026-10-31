"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, ArrowLeft, Check, CheckCircle2, ClipboardList, Copy, KeyRound, Loader2, LogOut, Plus, RefreshCw,
  Send, Trash2, TrendingUp, Trophy, UserMinus, X, XCircle,
} from "lucide-react";
import { Columns } from "@/components/main/charts";
import { GoldCard } from "@/components/main/PlayerCard";
import { ReportTile } from "@/components/main/ReportTile";
import { Empty, ErrorNote, Initials, Loading, PageHeader, Panel, Stat, btnSm } from "@/components/main/ui";
import { api, thumbUrl, type AnalysisSummary } from "@/lib/api";
import { dueLabel, shortDate, type Member, type PlayerInRoom, type RoomTask, type RoomView } from "@/lib/main";

type Tab = "overview" | "players" | "tasks" | "settings";

function Leaderboard({ room }: { room: RoomView }) {
  const [span, setSpan] = useState<"week" | "month">("week");
  const rows = room.leaderboard[span];
  return (
    <Panel hud="Leaderboard" title="Best count" testId="room-leaderboard"
      action={<div className="flex rounded-full border border-white/10 p-0.5" role="tablist" aria-label="Period">
        {(["week", "month"] as const).map((s) => <button key={s} type="button" role="tab" aria-selected={span === s} onClick={() => setSpan(s)} className="m-tab !px-3 !py-1 text-xs capitalize">{s}</button>)}
      </div>}>
      {rows.length ? (
        <ol className="space-y-1">
          {rows.slice(0, 8).map((r) => (
            <li key={r.user_id} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm">
              <span className={`w-5 text-center font-mono ${r.rank <= 3 ? "text-accent-300" : "text-chalk/50"}`}>{r.rank}</span>
              <Initials name={r.name} size="sm" />
              <span className="flex-1 text-white">{r.name}</span>
              <span className="font-mono font-semibold text-white">{r.touches}</span>
            </li>
          ))}
        </ol>
      ) : <p className="text-sm text-chalk/60">No videos this {span} yet.</p>}
    </Panel>
  );
}

function Milestones({ room }: { room: RoomView }) {
  return (
    <Panel hud="Together this month" title="Team milestones" testId="milestones">
      <ul className="space-y-4">
        {room.milestones.map((m) => {
          const pct = Math.min(100, (100 * m.value) / m.target);
          return (
            <li key={m.label}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-chalk/85">{m.label}</span>
                <span className="font-mono text-white">{m.value}<span className="text-chalk/50">/{m.target}</span></span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-accent-400/10"><div className="h-1.5 rounded-full bg-gradient-to-r from-accent-400 to-glow" style={{ width: `${pct}%` }} /></div>
              {pct >= 100 && <p className="mt-1 text-xs text-good"><Check className="mr-1 inline h-3 w-3" aria-hidden="true" />Reached</p>}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ---- Coach: players ----

function PlayerDrawer({ room, member, onClose, onChanged }: { room: RoomView; member: Member; onClose: () => void; onChanged: () => void }) {
  const [p, setP] = useState<PlayerInRoom | null>(null);
  const [note, setNote] = useState(member.scouting_note ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<PlayerInRoom>(`/rooms/${room.id}/players/${member.user_id}`).then(setP).catch((e) => setError(e.message));
  }, [room.id, member.user_id]);
  async function saveNote() {
    try {
      await api(`/rooms/${room.id}/members/${member.user_id}/note`, { method: "PUT", json: { note } });
      setSaved(true);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove() {
    if (!confirm(`Remove ${member.name} from ${room.name}?`)) return;
    try {
      await api(`/rooms/${room.id}/members/${member.user_id}`, { method: "DELETE" });
      onChanged();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-950/70 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={member.name} className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-ink-900 p-6" onClick={(e) => e.stopPropagation()} data-testid="player-drawer">
        <div className="flex items-center justify-between">
          <p className="hud">{member.position ?? "Player"}{member.country ? ` · ${member.country}` : ""}</p>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-white hover:bg-white/5" aria-label="Close"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <h2 className="mt-1 font-display text-2xl font-semibold text-white">{member.name}</h2>
        {error && <ErrorNote message={error} />}
        {!p ? <Loading label="Loading the player" /> : (
          <div className="mt-6 space-y-6">
            <GoldCard card={p.card} name={member.name} />
            <div>
              <p className="hud mb-3">Reports</p>
              {p.reports.length ? (
                <div className="grid grid-cols-2 gap-3">{p.reports.slice(0, 6).map((a: AnalysisSummary) => <ReportTile key={a.id} a={a} compact href={`/rooms/${room.id}/reports/${a.id}`} />)}</div>
              ) : <p className="text-sm text-chalk/60">No reports yet.</p>}
            </div>
            <div>
              <label className="hud mb-2 block" htmlFor="scout-note">{room.kind === "academy" ? "Scouting report" : "Coach's notes"}</label>
              <textarea id="scout-note" value={note} onChange={(e) => { setNote(e.target.value); setSaved(false); }} rows={4} maxLength={2000} className="m-input" placeholder="Only you can see this." data-testid="scout-note" />
              <button type="button" onClick={saveNote} className="btn-secondary mt-2 !py-2" data-testid="scout-save">{saved ? <><Check className="h-4 w-4" aria-hidden="true" /> Saved</> : "Save note"}</button>
            </div>
            <button type="button" onClick={remove} className={`${btnSm} !border-flare/30 !text-flare`}><UserMinus className="h-4 w-4" aria-hidden="true" /> Remove from room</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Players({ room, reload }: { room: RoomView; reload: () => void }) {
  const [open, setOpen] = useState<Member | null>(null);
  const members = room.members ?? [];
  if (!members.length) return <Empty icon={KeyRound} title="No players yet" text={`Share the join code ${room.join_code} with your players.`} />;
  const bar = room.criteria?.min_touches;
  return (
    <>
      <div className="glass overflow-x-auto !p-0">
        <table className="w-full min-w-[640px] text-sm" data-testid="players-table">
          <thead className="text-left text-xs text-chalk/50">
            <tr><th className="px-4 py-3 font-normal">Player</th><th className="px-3 py-3 text-right font-normal">Best</th><th className="px-3 py-3 text-right font-normal">Last</th>
              <th className="px-3 py-3 text-right font-normal">Since joining</th><th className="px-3 py-3 text-right font-normal">30 days</th><th className="px-3 py-3 text-right font-normal">Tasks</th>
              {bar ? <th className="px-3 py-3 text-right font-normal">Bar ({bar})</th> : <th className="px-3 py-3 text-right font-normal">Last video</th>}</tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const change = m.first != null && m.last != null ? m.last - m.first : null;
              return (
                <tr key={m.user_id} className="cursor-pointer border-t border-white/[0.06] hover:bg-white/[0.03]" onClick={() => setOpen(m)}>
                  <td className="px-4 py-3">
                    <button type="button" className="flex items-center gap-3 text-left" onClick={(e) => { e.stopPropagation(); setOpen(m); }} data-testid="player-row">
                      <Initials name={m.name} size="sm" />
                      <span><span className="block font-medium text-white">{m.name}</span><span className="text-xs text-chalk/50">{m.position ?? "–"}{m.country ? ` · ${m.country}` : ""}</span></span>
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-white">{m.best ?? "–"}</td>
                  <td className="px-3 py-3 text-right font-mono text-chalk/80">{m.last ?? "–"}</td>
                  <td className={`px-3 py-3 text-right font-mono ${change == null || change === 0 ? "text-chalk/50" : change > 0 ? "text-good" : "text-flare"}`}>{change == null ? "–" : `${change > 0 ? "+" : ""}${change}`}</td>
                  <td className="px-3 py-3 text-right font-mono text-chalk/80">{m.sessions_30d}</td>
                  <td className="px-3 py-3 text-right font-mono text-chalk/80">{m.tasks_done}/{m.tasks_total}</td>
                  {bar ? (
                    <td className="px-3 py-3 text-right">{m.meets_criteria ? <span className="text-good"><CheckCircle2 className="inline h-4 w-4" aria-hidden="true" /> Meets</span> : <span className="text-chalk/50"><XCircle className="inline h-4 w-4" aria-hidden="true" /> Not yet</span>}</td>
                  ) : <td className="px-3 py-3 text-right text-xs text-chalk/50">{m.last_active ? shortDate(m.last_active) : "never"}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {open && <PlayerDrawer room={room} member={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  );
}

// ---- Coach: tasks ----

function TaskForm({ room, onCreated }: { room: RoomView; onCreated: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultDue = new Date(Date.now() + 5 * 86_400_000);
  defaultDue.setHours(18, 0, 0, 0);
  const local = new Date(defaultDue.getTime() - defaultDue.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      await api(`/rooms/${room.id}/tasks`, { method: "POST", json: {
        title: f.get("title"), notes: f.get("notes") || null, due_at: new Date(String(f.get("due_at"))).toISOString(),
        target_touches: f.get("target") ? Number(f.get("target")) : null, assignee_id: f.get("assignee") ? Number(f.get("assignee")) : null,
      } });
      form.reset();
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel hud="New task" title="Set a video task" testId="task-form">
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
        <input name="title" required minLength={2} maxLength={120} placeholder="e.g. Weak foot: 15 touches" className="m-input sm:col-span-2" data-testid="task-title" />
        <textarea name="notes" maxLength={500} rows={2} placeholder="Notes for the players (optional)" className="m-input sm:col-span-2" />
        <label className="space-y-1 text-sm"><span className="text-chalk/70">Deadline</span><input name="due_at" type="datetime-local" required defaultValue={local} className="m-input" data-testid="task-due" /></label>
        <label className="space-y-1 text-sm"><span className="text-chalk/70">Touch target (optional)</span><input name="target" type="number" min={1} max={500} className="m-input" /></label>
        <label className="space-y-1 text-sm sm:col-span-2"><span className="text-chalk/70">For</span>
          <select name="assignee" className="m-input"><option value="">The whole room</option>{room.members?.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}</select></label>
        <div className="sm:col-span-2"><ErrorNote message={error} /></div>
        <button type="submit" disabled={busy} className="btn-primary sm:col-span-2 sm:w-fit" data-testid="task-submit">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />} Set task</button>
      </form>
    </Panel>
  );
}

function Review({ roomId, sub, target, onDone }: { roomId: number; sub: RoomTask["submissions"][number]; target: number | null; onDone: () => void }) {
  const [score, setScore] = useState(sub.score ?? 75);
  const [note, setNote] = useState(sub.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/rooms/submissions/${sub.id}/review`, { method: "POST", json: { score, note } });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const thumb = sub.analysis ? thumbUrl(sub.analysis) : null;
  return (
    <li className="rounded-2xl border border-white/[0.06] bg-ink-950/40 p-3" data-testid="submission">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {thumb ? <img src={thumb} alt="" className="h-12 w-20 rounded-lg object-cover" /> : <span className="h-12 w-20 rounded-lg bg-ink-800" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{sub.name}</p>
          <p className="text-xs text-chalk/60">
            {sub.analysis ? <Link href={`/rooms/${roomId}/reports/${sub.analysis.id}`} className="underline-offset-4 hover:underline">{sub.analysis.touches} touches</Link> : "report deleted"}
            {target != null && <span className={sub.met_target ? " text-good" : " text-chalk/50"}> · {sub.met_target ? "met" : "below"} target</span>}
            {" · "}{shortDate(sub.created_at)}
          </p>
        </div>
        {sub.reviewed && <span className="chip !text-good">{sub.score}/100</span>}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-xs text-chalk/70">Score
          <input type="range" min={0} max={100} step={5} value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-28 accent-[rgb(var(--accent-400))]" aria-label={`Score for ${sub.name}`} />
          <span className="w-8 font-mono text-white">{score}</span>
        </label>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Feedback note" className="m-input !py-2 text-sm sm:flex-1" aria-label={`Note for ${sub.name}`} />
        <button type="button" onClick={save} disabled={busy} className="btn-primary !px-4 !py-2" data-testid="review-save">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : sub.reviewed ? "Update" : "Score"}</button>
      </div>
      <ErrorNote message={error} />
    </li>
  );
}

function CoachTasks({ room, reload }: { room: RoomView; reload: () => void }) {
  async function remove(t: RoomTask) {
    if (!confirm(`Delete “${t.title}” and its hand-ins?`)) return;
    await api(`/rooms/${room.id}/tasks/${t.id}`, { method: "DELETE" }).catch(() => undefined);
    reload();
  }
  return (
    <div className="space-y-4">
      <TaskForm room={room} onCreated={reload} />
      {room.tasks.map((t) => (
        <Panel key={t.id} hud={`${t.assignee ? `For ${t.assignee.name}` : "Whole room"} · ${dueLabel(t.due_at)}`} title={t.title} testId="coach-task"
          action={<button type="button" onClick={() => remove(t)} className="rounded-lg p-2 text-chalk/50 hover:text-flare" aria-label={`Delete ${t.title}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}>
          {t.notes && <p className="-mt-2 mb-3 text-sm text-chalk/70">{t.notes}</p>}
          <div className="mb-3 flex items-center gap-3 text-sm">
            <div className="h-1.5 flex-1 rounded-full bg-white/10"><div className="h-1.5 rounded-full bg-accent-400" style={{ width: `${(100 * t.submissions.length) / Math.max(1, t.expected)}%` }} /></div>
            <span className="font-mono text-xs text-chalk/70">{t.submissions.length}/{t.expected} handed in</span>
            {t.target_touches && <span className="chip">target {t.target_touches}</span>}
          </div>
          {t.submissions.length ? <ul className="space-y-2">{t.submissions.map((s) => <Review key={s.id} roomId={room.id} sub={s} target={t.target_touches} onDone={reload} />)}</ul>
            : <p className="text-sm text-chalk/50">No hand-ins yet.</p>}
        </Panel>
      ))}
    </div>
  );
}

// ---- Player: tasks ----

function PlayerTasks({ room, reload }: { room: RoomView; reload: () => void }) {
  const [mine, setMine] = useState<AnalysisSummary[]>([]);
  const [pick, setPick] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<AnalysisSummary[]>("/analyses").then((r) => setMine(r.filter((a) => a.status === "done"))).catch(() => undefined);
  }, []);
  async function submit(t: RoomTask) {
    setError(null);
    const id = pick[t.id] ?? (mine[0] ? String(mine[0].id) : "");
    if (!id) return setError("Analyse a video first, then hand it in here.");
    try {
      await api(`/rooms/tasks/${t.id}/submit`, { method: "POST", json: { analysis_id: Number(id) } });
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!room.tasks.length) return <Empty icon={ClipboardList} title="No tasks yet" text="Your coach hasn't set any tasks. You'll get a notification when they do." />;
  return (
    <div className="space-y-3">
      <ErrorNote message={error} />
      {room.tasks.map((t) => {
        const sub = t.submissions[0];
        return (
          <Panel key={t.id} hud={t.overdue ? "Past deadline" : dueLabel(t.due_at)} title={t.title} testId="player-task">
            {t.notes && <p className="-mt-2 mb-3 text-sm text-chalk/70">{t.notes}</p>}
            {t.target_touches && <p className="mb-3 text-sm text-chalk/80">Target: <span className="font-mono text-white">{t.target_touches}</span> touches</p>}
            {sub ? (
              <div className="rounded-2xl border border-white/[0.06] bg-ink-950/40 p-3 text-sm">
                <p className="text-white"><CheckCircle2 className="mr-1.5 inline h-4 w-4 text-good" aria-hidden="true" />Handed in: {sub.analysis?.touches} touches{sub.met_target && <span className="text-good"> · target met</span>}</p>
                {sub.reviewed ? <p className="mt-2 text-chalk/80">Coach: <span className="font-mono font-semibold text-white">{sub.score}/100</span>{sub.note && <> · “{sub.note}”</>}</p>
                  : <p className="mt-1 text-chalk/50">Waiting for your coach&apos;s score.</p>}
              </div>
            ) : null}
            {!t.overdue && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <select value={pick[t.id] ?? ""} onChange={(e) => setPick((p) => ({ ...p, [t.id]: e.target.value }))} className="m-input sm:flex-1" aria-label={`Video for ${t.title}`}>
                  {mine.length ? mine.map((a) => <option key={a.id} value={a.id}>{a.title} · {a.touches} touches · {shortDate(a.created_at)}</option>) : <option value="">No analysed videos yet</option>}
                </select>
                <button type="button" onClick={() => submit(t)} className="btn-primary" data-testid="task-hand-in"><Send className="h-4 w-4" aria-hidden="true" /> {sub ? "Hand in a better one" : "Hand in"}</button>
                <Link href="/upload" className="btn-secondary">New video</Link>
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

// ---- Page ----

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<RoomView | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => api<RoomView>(`/rooms/${id}`).then(setRoom).catch((e) => setError(e.message)), [id]);
  useEffect(() => {
    load();
  }, [load]);

  if (error) return <><ErrorNote message={error} /><Link href="/rooms" className="btn-secondary mt-4">Back to rooms</Link></>;
  if (!room) return <Loading label="Opening the room" />;
  const coach = room.role === "coach";

  async function newCode() {
    await api(`/rooms/${room!.id}/code`, { method: "POST" }).catch((e) => setError(e.message));
    load();
  }
  async function del() {
    if (!confirm(`Delete ${room!.name}? Tasks and hand-ins go with it.`)) return;
    await api(`/rooms/${room!.id}`, { method: "DELETE" });
    router.push("/rooms");
  }
  async function leave() {
    if (!confirm(`Leave ${room!.name}? Your coach will no longer see your reports.`)) return;
    await api(`/rooms/${room!.id}/leave`, { method: "POST" });
    router.push("/rooms");
  }

  const header = (
    <PageHeader eyebrow={`${room.kind === "academy" ? "Academy trial" : "Team room"} · coach ${room.coach}`} title={room.name} sub={room.description ?? undefined}
      action={<div className="flex flex-wrap gap-2">
        <Link href="/rooms" className={btnSm}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Rooms</Link>
        {coach && room.join_code && (
          <button type="button" className={btnSm} onClick={() => { navigator.clipboard?.writeText(room.join_code!); setCopied(true); }} data-testid="join-code-chip">
            <KeyRound className="h-4 w-4 text-accent-300" aria-hidden="true" /> <span className="font-mono tracking-widest">{room.join_code}</span>
            {copied ? <Check className="h-4 w-4 text-good" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          </button>
        )}
        {!coach && <button type="button" onClick={leave} className={btnSm} data-testid="leave-room"><LogOut className="h-4 w-4" aria-hidden="true" /> Leave</button>}
      </div>} />
  );

  if (!coach) {
    return (
      <>
        {header}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div><p className="hud mb-3">Your tasks</p><PlayerTasks room={room} reload={load} /></div>
          <div className="space-y-4">
            <Leaderboard room={room} />
            <Milestones room={room} />
            <Panel hud="Squad" title={`${room.players?.length ?? 0} players`}>
              <ul className="flex flex-wrap gap-2">{room.players?.map((p) => <li key={p} className="chip">{p}</li>)}</ul>
            </Panel>
          </div>
        </div>
      </>
    );
  }

  const team = room.team!;
  const tabs: [Tab, string][] = [["overview", "Team dashboard"], ["players", `Players (${room.members?.length ?? 0})`], ["tasks", `Tasks (${room.tasks.length})`], ["settings", "Settings"]];
  return (
    <>
      {header}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-full border border-white/10 p-1 sm:w-fit" role="tablist" aria-label="Room sections">
        {tabs.map(([k, label]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="m-tab whitespace-nowrap" data-testid={`tab-${k}`}>{label}</button>)}
      </div>

      {tab === "overview" && (
        <div className="space-y-4" data-testid="team-dashboard">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Players" value={team.players} />
            <Stat label="Average best" value={team.average_best} unit="touches" />
            <Stat label="Tasks handed in" value={team.completion != null ? `${team.completion}%` : "–"} />
            <Stat label="Top player" value={team.top[0]?.best ?? "–"} hint={team.top[0]?.name ?? "no videos yet"} />
          </div>
          {room.alerts && room.alerts.length > 0 && (
            <Panel hud="Team insights" title="Worth a look" testId="alerts">
              <ul className="space-y-2">
                {room.alerts.map((a, i) => (
                  <li key={i} className={`flex gap-2 rounded-xl px-3 py-2 text-sm ${a.level === "good" ? "bg-good/10 text-good" : "bg-flare/10 text-flare"}`}>
                    {a.level === "good" ? <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}{a.text}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Panel hud="Each player's best that week, averaged" title="Team average by week">
              <Columns ariaLabel="Team average touches for each of the last six weeks" unit=" touches"
                data={team.weekly.map((w, i) => ({ label: shortDate(w.week), value: w.average, highlight: i === team.weekly.length - 1 }))} height={200} />
            </Panel>
            <Panel hud="Top performers" title={<span className="flex items-center gap-2"><Trophy className="h-5 w-5 text-accent-300" aria-hidden="true" /> Best counts</span>}>
              <ol className="space-y-3">
                {team.top.map((t, i) => (
                  <li key={t.name} className="flex items-center gap-3"><span className="w-5 font-mono text-accent-300">{i + 1}</span><Initials name={t.name} size="sm" /><span className="flex-1 text-sm text-white">{t.name}</span><span className="font-mono font-semibold text-white">{t.best}</span></li>
                ))}
              </ol>
            </Panel>
          </div>
          <div className="grid gap-4 lg:grid-cols-2"><Leaderboard room={room} /><Milestones room={room} /></div>
        </div>
      )}
      {tab === "players" && <Players room={room} reload={load} />}
      {tab === "tasks" && <CoachTasks room={room} reload={load} />}
      {tab === "settings" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel hud="Join code" title={<span className="font-mono tracking-[0.3em]" data-testid="join-code">{room.join_code}</span>}>
            <p className={`text-sm ${room.code_expired ? "text-flare" : "text-chalk/70"}`}>{room.code_expired ? "Expired" : "Expires"} {new Date(room.code_expires_at!).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. Codes last 7 days so old ones can&apos;t be passed around.</p>
            <button type="button" onClick={newCode} className="btn-secondary mt-4 !py-2" data-testid="new-code"><RefreshCw className="h-4 w-4" aria-hidden="true" /> New code</button>
          </Panel>
          <Panel hud="Danger zone" title="Delete this room">
            <p className="text-sm text-chalk/70">Players keep their own reports; the room&apos;s tasks and scores are deleted.</p>
            <button type="button" onClick={del} className={`${btnSm} mt-4 !border-flare/30 !text-flare`}><Trash2 className="h-4 w-4" aria-hidden="true" /> Delete room</button>
          </Panel>
        </div>
      )}
    </>
  );
}
