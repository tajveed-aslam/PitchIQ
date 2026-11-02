import Image from "next/image";
import Link from "next/link";
import { PlayCircle, Sparkles } from "lucide-react";
import { SAMPLES } from "@/lib/samples";

export function Hero() {
  const showcase = SAMPLES.find((s) => s.id === "juggling-43487") ?? SAMPLES[0];
  const m = showcase?.report.metrics;
  return (
    <section className="container-page grid items-center gap-10 pb-16 pt-10 lg:grid-cols-[1fr_1.1fr] lg:pt-16">
      <div className="max-w-xl space-y-6">
        <span className="chip border-accent-400/30 bg-accent-400/10 text-accent-200">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Computer vision + AI coaching
        </span>
        <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight text-white sm:text-7xl">
          Your phone sees <span className="text-accent-400">every touch.</span>
        </h1>
        <p className="max-w-lg text-lg text-chalk/80">
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

      <div className="relative pb-14 lg:pb-10">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-xl">
          <Image
            src="/images/day-juggle.webp"
            alt="A player juggles a football on a green artificial pitch in daylight"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        {m && (
          <div className="card absolute bottom-0 left-4 w-64 p-4 shadow-xl sm:left-6 sm:w-72">
            <p className="eyebrow">Sample result</p>
            <p className="text-sm text-chalk/70">{showcase.title}</p>
            <div className="mt-2 flex items-end gap-3">
              <p className="font-display text-5xl font-extrabold leading-none text-white">{m.touches}</p>
              <p className="text-sm text-chalk/80">touches<span className="block text-chalk/60">likely {m.touches_range[0]}–{m.touches_range[1]}</span></p>
            </div>
            <p className="mt-2 text-sm text-chalk/80">Hand count: <span className="font-semibold text-white">{showcase.ground_truth.touches}</span></p>
          </div>
        )}
      </div>
    </section>
  );
}
