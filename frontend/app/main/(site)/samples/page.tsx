import Image from "next/image";
import { SampleRunner } from "@/components/main/SampleRunner";
import { SAMPLES } from "@/lib/samples";

export const metadata = { title: "Try a sample" };

export default function Samples() {
  return (
    <>
      <section className="relative isolate overflow-hidden pb-14 pt-32">
        <Image src="/images/main/night-kick.webp" alt="" fill priority sizes="100vw" className="-z-20 object-cover object-[60%_center] opacity-30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-950/70 via-ink-950/85 to-ink-950" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="hud text-accent-300">Sample analysis</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">See the AI count, <span className="text-gradient">then check it.</span></h1>
          <p className="mt-4 max-w-2xl text-lg text-chalk/75">Each clip was counted by hand, frame by frame. Run the analysis and compare: the timeline marks every touch the AI found against every touch a person counted.</p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl space-y-20 px-4 pb-24 sm:px-6">
        {SAMPLES.map((s, i) => <SampleRunner key={s.id} sample={s} index={i} />)}
      </div>
    </>
  );
}
