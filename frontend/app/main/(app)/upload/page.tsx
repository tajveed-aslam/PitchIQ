"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, FileVideo, FolderOpen, Loader2, Lock, Wifi } from "lucide-react";
import { ErrorNote, PageHeader, Panel } from "@/components/main/ui";
import { uploadVideo } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { dataSaverSupported, shrinkVideo } from "@/lib/dataSaver";

const MAX_MB = 25; // MAX_UPLOAD_MB on the server
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// Juggling is measured today; the rest are on the roadmap and shown as such rather than hidden or faked.
const SKILLS = [
  { id: "juggling", label: "Juggling", ready: true, note: "Touches, rhythm, control" },
  { id: "dribbling", label: "Dribbling", ready: false, note: "In validation" },
  { id: "passing", label: "Passing", ready: false, note: "Planned" },
  { id: "shooting", label: "Shooting", ready: false, note: "Planned" },
];

type Step = { kind: "idle" } | { kind: "shrinking"; pct: number } | { kind: "uploading"; pct: number; size: number };

export default function Analyse() {
  const { user, allowance, refresh } = useSession();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [saver, setSaver] = useState(true);
  const [supported, setSupported] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const title = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSupported(dataSaverSupported());
  }, []);
  if (!user || !allowance) return null;
  const blocked = allowance.trial_expired || allowance.remaining <= 0;
  const busy = step.kind !== "idle";

  function pick(f: File | undefined) {
    setError(null);
    setNote(null);
    if (!f) return;
    if (!f.type.startsWith("video/")) return setError("That isn't a video. Choose an MP4, MOV or WebM file.");
    setFile(f);
  }

  async function start() {
    if (!file) return;
    setError(null);
    try {
      let blob: Blob = file, name = file.name;
      if (saver && supported) {
        setStep({ kind: "shrinking", pct: 0 });
        const out = await shrinkVideo(file, (pct) => setStep({ kind: "shrinking", pct }));
        blob = out.blob;
        name = out.filename;
        setNote(out.shrunk ? `Data saver: ${mb(file.size)} → ${mb(blob.size)}` : out.reason ?? null);
      }
      if (blob.size > MAX_MB * 1024 * 1024) throw new Error(`The video is ${mb(blob.size)}; the limit is ${MAX_MB} MB. Trim it or turn on the data saver.`);
      setStep({ kind: "uploading", pct: 0, size: blob.size });
      const a = await uploadVideo(blob, name, title.current?.value || "Juggling session", (pct) => setStep({ kind: "uploading", pct, size: blob.size }));
      await refresh();
      router.push(`/reports/${a.id}`);
    } catch (e) {
      setError((e as Error).message);
      setStep({ kind: "idle" });
    }
  }

  return (
    <>
      <PageHeader eyebrow="Skill analysis" title="Analyse a session" sub={`${allowance.remaining} of ${allowance.limit} analyses left. Videos are deleted after analysis; we keep a thumbnail and the report.`} />
      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          <Panel hud="1 · Skill">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Skill">
              {SKILLS.map((s) => (
                <div key={s.id} role="radio" aria-checked={s.ready} aria-disabled={!s.ready}
                  className={`rounded-2xl border p-3 ${s.ready ? "border-accent-400/60 bg-accent-400/10" : "border-white/[0.06] opacity-60"}`}>
                  <p className="flex items-center justify-between text-sm font-medium text-white">{s.label}{!s.ready && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}</p>
                  <p className="text-xs text-chalk/60">{s.note}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel hud="2 · Video" testId="upload-panel">
            {blocked ? (
              <div className="space-y-3" data-testid="upload-blocked">
                <p className="text-white">{allowance.trial_expired ? "Your free trial has ended." : `You've used all ${allowance.limit} analyses for this ${allowance.period === "trial" ? "trial" : allowance.period === "today" ? "day" : "month"}.`}</p>
                <Link href="/settings#plan" className="btn-primary">See plans</Link>
              </div>
            ) : (
              <div className="space-y-5">
                <label onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${drag ? "border-accent-400 bg-accent-400/10" : "border-white/15 hover:border-accent-400/50"}`}>
                  {file ? <FileVideo className="h-10 w-10 text-accent-300" aria-hidden="true" /> : <FolderOpen className="h-10 w-10 text-chalk/40" aria-hidden="true" />}
                  {file ? (
                    <span className="flex items-center gap-2 text-sm text-white" data-testid="chosen-file"><CheckCircle2 className="h-4 w-4 text-good" aria-hidden="true" /> {file.name} · {mb(file.size)}</span>
                  ) : (
                    <span><span className="block font-medium text-white">Drop a video here or choose one</span><span className="text-sm text-chalk/60">MP4, MOV or WebM · up to 60 seconds</span></span>
                  )}
                  <input type="file" accept="video/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} disabled={busy} data-testid="file-input" />
                </label>
                <label className="btn-secondary w-full cursor-pointer sm:hidden">
                  <Camera className="h-4 w-4" aria-hidden="true" /> Record now
                  <input type="file" accept="video/*" capture="environment" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} disabled={busy} />
                </label>
                <label className="block space-y-1.5 text-sm">
                  <span className="text-chalk/80">Name this session <span className="text-chalk/50">(optional)</span></span>
                  <input ref={title} maxLength={120} placeholder="Juggling session" className="m-input" disabled={busy} data-testid="upload-title" />
                </label>
                <label className={`flex items-start gap-3 rounded-2xl border p-4 ${supported ? "border-white/10" : "border-white/[0.06] opacity-60"}`}>
                  <input type="checkbox" checked={saver && supported} disabled={!supported || busy} onChange={(e) => setSaver(e.target.checked)} className="mt-1 h-5 w-5 accent-[rgb(var(--accent-400))]" data-testid="data-saver" />
                  <span>
                    <span className="flex items-center gap-2 font-medium text-white"><Wifi className="h-4 w-4 text-accent-300" aria-hidden="true" /> Data saver</span>
                    <span className="text-sm text-chalk/60">{supported ? "Shrinks the video in your browser first (480p, no sound): a few MB instead of tens, same accuracy." : "Your browser can't shrink videos, so the original is sent. Record at 720p to save data."}</span>
                  </span>
                </label>
                {step.kind !== "idle" && (
                  <div className="space-y-2" aria-live="polite" data-testid="upload-progress">
                    <p className="flex items-center gap-2 text-sm text-white"><Loader2 className="h-4 w-4 animate-spin text-accent-300" aria-hidden="true" />
                      {step.kind === "shrinking" ? `Shrinking video… ${step.pct}%` : `Uploading ${mb(step.size)}… ${step.pct}%`}</p>
                    <div className="h-1.5 rounded-full bg-white/10"><div className="h-1.5 rounded-full bg-gradient-to-r from-accent-400 to-glow transition-all" style={{ width: `${step.pct}%` }} /></div>
                  </div>
                )}
                {note && <p className="text-sm text-chalk/60">{note}</p>}
                <ErrorNote message={error} />
                <button type="button" onClick={start} disabled={!file || busy} className="btn-primary w-full !py-3.5 disabled:opacity-50" data-testid="upload-submit">Analyse my session</button>
              </div>
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          <figure className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/[0.08]">
            <Image src="/images/main/night-kick-sm.webp" alt="A player filmed from a still camera, whole body and ball in the picture" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            <figcaption className="absolute bottom-3 left-3 chip !bg-ink-950/80">Like this: still camera, whole body</figcaption>
          </figure>
          <Panel hud="Filming checklist">
            <ul className="space-y-2.5 text-sm text-chalk/85">
              {["Prop the phone up: a moving camera gets the video rejected (free, but you'll need to re-film).",
                "Whole body and the ball in the picture, 4–6 metres away.",
                "Good light; floodlights are fine.",
                "Start with the ball on the ground or in your hands."].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" aria-hidden="true" />{t}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-chalk/50">No video? <Link href="/samples" className="text-white underline-offset-4 hover:underline">Download a sample</Link> and upload it.</p>
          </Panel>
        </aside>
      </div>
    </>
  );
}
