import Image from "next/image";
import Link from "next/link";
import { PlayCircle, Sparkles } from "lucide-react";
import { SAMPLES } from "@/lib/samples";

export function Hero() {
  const showcase = SAMPLES.find((s) => s.id === "juggling-43487") ?? SAMPLES[0];
  const m = showcase?.report.metrics;
  return (
    <section className="relative isolate flex min-h-[640px] items-end overflow-hidden pb-16 pt-28 sm:min-h-[720px] sm:items-center">
      <Image
        src="/images/hero-bicycle.webp"
        alt="A player attempts a bicycle kick under floodlights on an artificial pitch"
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[60%_center]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/10 sm:bg-gradient-to-r sm:from-ink-950/95 sm:via-ink-950/50 sm:to-transparent" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink-950 to-transparent" />

      <div className="container-page grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="max-w-xl space-y-6">
          <span className="chip border-pitch-400/30 bg-pitch-400/10 text-pitch-200">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Computer vision + AI coaching
          </span>
          <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight text-white sm:text-7xl">
            Your phone sees <span className="text-pitch-400">every touch.</span>
          </h1>
          <p className="max-w-lg text-lg text-chalk/85">
            Film a juggling session, upload it, and PitchIQ counts your touches, reads your rhythm and ball control, then
            tells you what to work on next. Small uploads, made for slow connections.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/samples" className="btn-primary">
              <PlayCircle className="h-5 w-5" aria-hidden="true" /> Analyse a sample video
            </Link>
            <Link href="/signup" className="btn-secondary">Start free</Link>
          </div>
          <p className="text-sm text-chalk/60">No player video? Use ours: the samples run through the same AI.</p>
        </div>

        {m && (
          <div className="ml-auto hidden w-full max-w-sm rounded-2xl border border-white/15 bg-ink-900/75 p-5 shadow-glow backdrop-blur lg:block">
            <p className="eyebrow">Sample result</p>
            <p className="mt-1 text-sm text-chalk/70">{showcase.title}</p>
            <div className="mt-4 flex items-end gap-4">
              <p className="font-display text-7xl font-extrabold leading-none text-white">{m.touches}</p>
              <div className="pb-1 text-sm text-chalk/80">
                <p>touches</p>
                <p className="text-chalk/60">likely {m.touches_range[0]}–{m.touches_range[1]}</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-white/5 p-3 text-sm">
              Hand count: <span className="font-semibold text-white">{showcase.ground_truth.touches}</span>
              <span className="text-chalk/60"> · counted frame by frame</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
