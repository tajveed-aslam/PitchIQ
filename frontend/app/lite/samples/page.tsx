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
      <section className="container-page grid items-center gap-8 pb-4 pt-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="eyebrow">Sample library</p>
          <h1 className="heading mt-2 sm:text-6xl">See the AI count, then check it</h1>
          <p className="mt-4 text-lg text-chalk/80">
            Every sample was counted by hand, frame by frame. Analyse one to see the AI&apos;s count, its likely range,
            and where each touch landed against the hand count. One sample is filmed badly on purpose.
          </p>
        </div>
        <div className="relative hidden aspect-[4/3] overflow-hidden rounded-3xl shadow-lg lg:block">
          <Image src="/images/day-kick.webp" alt="A player lifts a football with a raised foot on a green pitch" fill priority sizes="33vw" className="object-cover" />
        </div>
      </section>
      <div className="container-page space-y-8 pb-20 pt-10">
        {SAMPLES.map((s) => (
          <SampleCard key={s.id} sample={s} />
        ))}
      </div>
    </>
  );
}
