"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Loader2, Mail } from "lucide-react";
import { ChatPanel } from "@/components/main/ChatDock";
import { ErrorNote } from "@/components/main/ui";
import { api } from "@/lib/api";

interface Faq { q: string; a: string }

function Contact() {
  const [topic, setTopic] = useState("Question");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ message: string }>("/support/contact", { method: "POST", json: {
        name: f.get("name"), email: f.get("email"), message: `[${topic}] ${f.get("message")}`,
      } });
      setDone(r.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (done) return <p className="flex items-center gap-2 text-good" data-testid="contact-done"><Check className="h-5 w-5" aria-hidden="true" /> {done}</p>;
  return (
    <form onSubmit={send} className="space-y-3" data-testid="contact-form">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Topic">
        {["Question", "Federation or academy", "Bug"].map((t) => (
          <button key={t} type="button" role="radio" aria-checked={topic === t} onClick={() => setTopic(t)}
            className={`rounded-full border px-3 py-1.5 text-sm ${topic === t ? "border-accent-400/60 bg-accent-400/10 text-white" : "border-white/10 text-chalk/70"}`}>{t}</button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required maxLength={80} placeholder="Name" aria-label="Name" className="m-input" data-testid="contact-name" />
        <input name="email" type="email" required placeholder="Email" aria-label="Email" className="m-input" data-testid="contact-email" />
      </div>
      <textarea name="message" required minLength={10} maxLength={1900} rows={4} aria-label="Message" className="m-input" data-testid="contact-message"
        placeholder={topic === "Federation or academy" ? "How many players and coaches, which skills, and when you'd like to start." : "How can we help?"} />
      <ErrorNote message={error} />
      <button type="submit" disabled={busy} className="btn-primary" data-testid="contact-submit">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />} Send</button>
    </form>
  );
}

export default function Support() {
  const [faq, setFaq] = useState<Faq[]>([]);
  useEffect(() => {
    api<Faq[]>("/support/faq?edition=main").then(setFaq).catch(() => setFaq([]));
  }, []);
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-32 sm:px-6">
      <p className="hud text-accent-300">Help centre</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">How can we help?</h1>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="faq-h">
          <h2 id="faq-h" className="hud mb-3">Common questions</h2>
          <ul className="space-y-2" data-testid="faq">
            {faq.map((f) => (
              <li key={f.q}>
                <details className="glass group !rounded-2xl px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-white">
                    {f.q}<ChevronDown className="h-4 w-4 shrink-0 text-chalk/50 transition group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-chalk/75">{f.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>
        <div className="space-y-6">
          <section aria-label="Assistant"><ChatPanel className="glass h-[460px] !p-0" /></section>
          <section id="contact" className="glass scroll-mt-24 p-6">
            <h2 className="font-display text-xl font-semibold text-white">Contact us</h2>
            <p className="mb-4 mt-1 text-sm text-chalk/60">Federations and academies: tell us about your squads and we&apos;ll put together a custom plan.</p>
            <Contact />
          </section>
        </div>
      </div>
    </div>
  );
}
