import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, Check, CloudUpload, Lightbulb, MessageSquareText, Smartphone, Sun, Wifi } from "lucide-react";
import { EDITION } from "@/config/editions";
import { SAMPLES } from "@/lib/samples";

// Accuracy figures come from the ground-truth tests (analysis/spike/evaluate_juggling.py), not marketing.
const STATS = [
  { value: "92%", label: "of touches found in our hand-counted tests" },
  { value: "±2", label: "touches off, at most, on every test clip" },
  { value: "~40 s", label: "to analyse a 30-second video" },
  { value: "<3 MB", label: "per upload with the data saver" },
];

export function StatsStrip() {
  return (
    <section aria-label="Accuracy and speed" className="border-y border-white/10 bg-ink-900">
      <div className="container-page grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label}>
            <p className="font-display text-4xl font-extrabold text-pitch-400">{s.value}</p>
            <p className="text-sm text-chalk/70">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { icon: Camera, title: "Film", text: "Prop your phone up, whole body and ball in the picture, and juggle for up to a minute.", img: "/images/floodlights-sm.webp", alt: "A player juggling on a floodlit pitch, filmed from a distance" },
  { icon: CloudUpload, title: "Upload", text: "The data saver shrinks your video before it leaves your phone. A quality check tells you if it needs re-filming.", img: "/images/knee-volley-sm.webp", alt: "A player lifting the ball with his knee" },
  { icon: MessageSquareText, title: "Improve", text: "Get your touch count, rhythm and control, then coaching and drills written from those numbers.", img: "/images/head-height-sm.webp", alt: "A player watching the ball drop from head height" },
];

export function HowItWorks() {
  return (
    <section id="how" className="container-page scroll-mt-20 py-20">
      <p className="eyebrow">How it works</p>
      <h2 className="heading mt-2 max-w-2xl">Three steps from the pitch to your report</h2>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <article key={s.title} className="card overflow-hidden">
            <div className="relative aspect-video">
              <Image src={s.img} alt={s.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
              <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-pitch-400 font-display text-lg font-extrabold text-ink-950">
                {i + 1}
              </span>
            </div>
            <div className="space-y-2 p-5">
              <h3 className="flex items-center gap-2 font-display text-2xl font-bold uppercase text-white">
                <s.icon className="h-5 w-5 text-pitch-400" aria-hidden="true" /> {s.title}
              </h3>
              <p className="text-chalk/75">{s.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SamplesPreview() {
  return (
    <section className="relative overflow-hidden bg-ink-900 py-20">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Try it now</p>
            <h2 className="heading mt-2">No video? Use ours</h2>
            <p className="mt-3 max-w-xl text-chalk/75">
              Real juggling sessions, each counted by hand frame by frame, so you can see exactly how close the AI gets.
            </p>
          </div>
          <Link href="/samples" className="btn-secondary">
            All samples <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SAMPLES.map((s) => (
            <Link key={s.id} href={`/samples#${s.id}`} className="group card overflow-hidden transition hover:border-pitch-400/50">
              <div className="relative aspect-video">
                <Image src={s.poster} alt={`Still from the sample video: ${s.title}`} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition duration-500 group-hover:scale-105" />
                <span className="chip absolute left-2 top-2 bg-ink-950/80">{s.level}</span>
              </div>
              <div className="p-4">
                <h3 className="font-display text-xl font-bold uppercase text-white">{s.title}</h3>
                <p className="mt-1 text-sm text-chalk/70">
                  {s.ground_truth.touches != null
                    ? `AI ${s.report.metrics.touches} · hand ${s.ground_truth.touches} touches`
                    : "Quality-check demo"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Plans() {
  return (
    <section id="plans" className="container-page scroll-mt-20 py-20">
      <p className="eyebrow">Plans</p>
      <h2 className="heading mt-2">Priced for players, not clubs</h2>
      <p className="mt-3 text-chalk/70">Test mode: pick any plan to explore it, nothing is charged.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {EDITION.plans.map((p) => (
          <article key={p.id} className={`card flex flex-col p-6 ${p.highlight ? "border-pitch-400/60 shadow-glow" : ""}`}>
            {p.highlight && <span className="chip mb-3 w-fit border-pitch-400/40 text-pitch-300">Most popular</span>}
            <h3 className="font-display text-2xl font-bold uppercase text-white">{p.name}</h3>
            <p className="mt-1 text-sm text-chalk/70">{p.blurb}</p>
            <p className="mt-5 font-display text-5xl font-extrabold text-white">
              {p.price}
              <span className="ml-1 font-sans text-sm font-normal text-chalk/60">{p.period}</span>
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-pitch-400" aria-hidden="true" /> {f}
                </li>
              ))}
            </ul>
            <Link href={`/signup?plan=${p.id}`} className={`mt-6 ${p.highlight ? "btn-primary" : "btn-secondary"}`}>
              Choose {p.name}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

const TIPS = [
  { icon: Smartphone, text: "Prop the phone up. A moving camera makes the ball look like it moves." },
  { icon: Camera, text: "Whole body and ball in the picture, from about 4–6 metres away." },
  { icon: Sun, text: "Good light, plain background. Floodlights work; a dark corner doesn't." },
  { icon: Wifi, text: "Keep the data saver on: it shrinks the video without hurting the count." },
];

export function FilmingTips() {
  return (
    <section id="tips" className="scroll-mt-20 bg-ink-900">
      <div className="container-page grid items-center gap-10 py-20 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
          <Image src="/images/street-juggle.webp" alt="Close view of a player juggling a ball in front of a painted wall" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
        <div>
          <p className="eyebrow">Filming tips</p>
          <h2 className="heading mt-2">Get an accurate count first time</h2>
          <ul className="mt-8 space-y-4">
            {TIPS.map((t) => (
              <li key={t.text} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pitch-400/15">
                  <t.icon className="h-5 w-5 text-pitch-400" aria-hidden="true" />
                </span>
                <p className="pt-2 text-chalk/85">{t.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// Sample testimonials: invented for the demo and labelled as such, with initials (never a real person's photo).
const QUOTES = [
  { initials: "KA", name: "Kwame A.", role: "Winger, U17", quote: "I film in the yard after school. Seeing my rhythm go from uneven to steady in a month kept me going." },
  { initials: "AN", name: "Amara N.", role: "Midfielder", quote: "The upload works on my phone data. Ten minutes later I know what to drill tomorrow." },
  { initials: "TM", name: "Coach T. M.", role: "Youth academy", quote: "The hand-count comparison sold me. It shows when it's unsure instead of guessing." },
];

export function Testimonials() {
  return (
    <section className="container-page py-20">
      <p className="eyebrow">What players say</p>
      <h2 className="heading mt-2">Training, measured</h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {QUOTES.map((q) => (
          <figure key={q.name} className="card relative p-6">
            <span className="chip absolute right-4 top-4 text-[10px] uppercase tracking-wider">Sample</span>
            <Lightbulb className="h-6 w-6 text-pitch-400" aria-hidden="true" />
            <blockquote className="mt-4 text-chalk/90">&ldquo;{q.quote}&rdquo;</blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-600 font-display font-bold text-white">{q.initials}</span>
              <span className="text-sm">
                <span className="block font-semibold text-white">{q.name}</span>
                <span className="text-chalk/60">{q.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden">
      <Image src="/images/high-kick.webp" alt="" fill sizes="100vw" className="-z-20 object-cover" />
      <div className="absolute inset-0 -z-10 bg-ink-950/60" />
      <div className="container-page py-24 text-center">
        <h2 className="heading mx-auto max-w-2xl">Your next session counts. Literally.</h2>
        <p className="mx-auto mt-4 max-w-xl text-chalk/80">Start with a sample, then try your own video on the free trial.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/samples" className="btn-primary">Try a sample</Link>
          <Link href="/signup" className="btn-secondary">Start free</Link>
        </div>
      </div>
    </section>
  );
}
