import type { Metadata } from "next";
import Image from "next/image";
import { SampleCard } from "@/components/SampleCard";
import { SAMPLES } from "@/lib/samples";

export const metadata: Metadata = {
  title: "Sample videos · PitchIQ",
  description: "Run PitchIQ's touch counter on real juggling videos and compare it with a frame-by-frame hand count.",
};

export default function SamplesPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden pb-14 pt-32">
        <Image src="/images/knee-volley.webp" alt="" fill priority sizes="100vw" className="-z-20 object-cover object-top" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-950/40 via-ink-950/70 to-ink-950" />
        <div className="container-page max-w-3xl">
          <p className="eyebrow">Sample library</p>
          <h1 className="heading mt-2 sm:text-6xl">See the AI count, then check it</h1>
          <p className="mt-4 text-lg text-chalk/80">
            Every sample was counted by hand, frame by frame. Analyse one to see the AI&apos;s count, its likely range,
            and where each touch landed against the hand count. One sample is filmed badly on purpose.
          </p>
        </div>
      </section>
      <div className="container-page space-y-8 pb-20">
        {SAMPLES.map((s) => (
          <SampleCard key={s.id} sample={s} />
        ))}
      </div>
    </>
  );
}
