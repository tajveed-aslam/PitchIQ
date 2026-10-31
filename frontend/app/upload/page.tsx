"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, FolderOpen, Loader2, Wifi } from "lucide-react";
import { PageShell } from "@/components/app/Bits";
import { Field, FormError, inputCls } from "@/components/AuthLayout";
import { uploadVideo } from "@/lib/api";
import { useRequireUser } from "@/lib/auth";
import { dataSaverSupported, shrinkVideo } from "@/lib/dataSaver";

const MAX_MB = 25; // matches MAX_UPLOAD_MB on the server (protects the free server's 512 MB of memory)
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

type Step = { kind: "idle" } | { kind: "shrinking"; pct: number } | { kind: "uploading"; pct: number; size: number };

export default function UploadPage() {
  const { user, allowance, refresh } = useRequireUser();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [saver, setSaver] = useState(true);
  const [supported, setSupported] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    <PageShell eyebrow="New analysis" title="Upload a juggling session">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="card space-y-6 p-5 sm:p-6">
          {blocked ? (
            <div className="space-y-3" data-testid="upload-blocked">
              <p className="text-white">
                {allowance.trial_expired ? "Your free trial has ended." : `You've used all ${allowance.limit} analyses for this ${allowance.period === "trial" ? "trial" : allowance.period === "today" ? "day" : "month"}.`}
              </p>
              <Link href="/profile#plan" className="btn-primary">See plans</Link>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="btn-primary cursor-pointer">
                  <Camera className="h-5 w-5" aria-hidden="true" /> Record now
                  <input type="file" accept="video/*" capture="environment" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} disabled={busy} />
                </label>
                <label className="btn-secondary cursor-pointer">
                  <FolderOpen className="h-5 w-5" aria-hidden="true" /> Choose a video
                  <input type="file" accept="video/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} disabled={busy} data-testid="file-input" />
                </label>
              </div>

              {file && (
                <p className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-3 text-sm text-chalk" data-testid="chosen-file">
                  <CheckCircle2 className="h-4 w-4 text-pitch-400" aria-hidden="true" /> {file.name} · {mb(file.size)}
                </p>
              )}

              <Field label="Name this session" hint="Optional, e.g. “Tuesday, both feet”.">
                <input ref={title} maxLength={120} placeholder="Juggling session" className={inputCls} disabled={busy} data-testid="upload-title" />
              </Field>

              <label className={`flex items-start gap-3 rounded-xl border p-4 ${supported ? "border-white/15" : "border-white/10 opacity-60"}`}>
                <input type="checkbox" checked={saver && supported} disabled={!supported || busy} onChange={(e) => setSaver(e.target.checked)} className="mt-1 h-5 w-5 accent-[#5be07f]" data-testid="data-saver" />
                <span>
                  <span className="flex items-center gap-2 font-semibold text-white"><Wifi className="h-4 w-4 text-pitch-400" aria-hidden="true" /> Data saver</span>
                  <span className="text-sm text-chalk/70">
                    {supported ? "Shrinks the video on your phone first (to 480p, no sound): usually a few MB instead of tens. Takes about as long as the clip." : "Your browser can't shrink videos, so the original will be sent. Record at 720p to save data."}
                  </span>
                </span>
              </label>

              {step.kind !== "idle" && (
                <div className="space-y-2" aria-live="polite" data-testid="upload-progress">
                  <div className="flex items-center gap-2 text-sm text-white">
                    <Loader2 className="h-4 w-4 animate-spin text-pitch-400" aria-hidden="true" />
                    {step.kind === "shrinking" ? `Shrinking video… ${step.pct}%` : `Uploading ${mb(step.size)}… ${step.pct}%`}
                  </div>
                  <div className="h-2 rounded-full bg-ink-950"><div className="h-2 rounded-full bg-pitch-400 transition-all" style={{ width: `${step.pct}%` }} /></div>
                </div>
              )}
              {note && <p className="text-sm text-chalk/70">{note}</p>}
              <FormError message={error} />
              <button type="button" onClick={start} disabled={!file || busy} className="btn-primary w-full disabled:opacity-50" data-testid="upload-submit">
                Analyse my session
              </button>
              <p className="text-xs text-chalk/60">
                {allowance.remaining} of {allowance.limit} analyses left. Videos are deleted after analysis; we keep a thumbnail and the report. Up to 60 seconds; analysis takes a few minutes.
              </p>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-2xl">
            <Image src="/images/floodlights.webp" alt="A player juggling, filmed from a still camera with his whole body in the picture" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            <span className="chip absolute bottom-3 left-3 bg-ink-950/80">Like this: still camera, whole body</span>
          </div>
          <ul className="card space-y-2 p-5 text-sm text-chalk/85">
            <li>• Prop the phone up. A moving camera gets the video rejected.</li>
            <li>• Whole body and the ball in the picture, 4–6 metres away.</li>
            <li>• Good light; floodlights are fine.</li>
            <li>• Start with the ball on the ground or in your hands.</li>
          </ul>
        </aside>
      </div>
    </PageShell>
  );
}
