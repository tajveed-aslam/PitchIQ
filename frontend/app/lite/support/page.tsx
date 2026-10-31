"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import { PageShell } from "@/components/app/Bits";
import { Field, FormError, inputCls } from "@/components/AuthLayout";
import { api } from "@/lib/api";

interface Msg {
  role: "user" | "model";
  text: string;
}

function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "model", text: "Hi! Ask me about filming, uploads, your report or juggling practice." }]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" }); // returns a Promise in new browsers: never return it
  }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.current?.value.trim();
    if (!text || busy) return;
    input.current!.value = "";
    const history = msgs.slice(1);
    setMsgs((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const r = await api<{ reply: string }>("/support/chat", { method: "POST", json: { message: text, history } });
      setMsgs((m) => [...m, { role: "model", text: r.reply }]);
    } catch (err) {
      setMsgs((m) => [...m, { role: "model", text: (err as Error).message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex h-[460px] flex-col" data-testid="chat">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3 font-semibold text-white">
        <Bot className="h-5 w-5 text-accent-400" aria-hidden="true" /> Help assistant
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {msgs.map((m, i) => (
          <p key={i} className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "ml-auto bg-accent-400 text-ink-950" : "bg-ink-900 text-chalk"}`} data-testid={m.role === "model" ? "chat-reply" : undefined}>
            {m.text}
          </p>
        ))}
        {busy && <Loader2 className="h-5 w-5 animate-spin text-accent-400" aria-label="Thinking" />}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-3">
        <input ref={input} maxLength={500} placeholder="Why was my video rejected?" className={inputCls} aria-label="Your question" data-testid="chat-input" />
        <button type="submit" disabled={busy} className="btn-primary !px-4" aria-label="Send"><Send className="h-5 w-5" aria-hidden="true" /></button>
      </form>
    </div>
  );
}

export default function SupportPage() {
  const [faq, setFaq] = useState<{ q: string; a: string }[]>([]);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ q: string; a: string }[]>("/support/faq").then(setFaq).catch(() => setFaq([]));
  }, []);

  async function contact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(null);
    try {
      const r = await api<{ message: string }>("/support/contact", { method: "POST", json: Object.fromEntries(f) });
      setSent(r.message);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <PageShell eyebrow="Support" title="How can we help?">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <Chat />
          <div className="card p-5 sm:p-6">
            <h2 className="font-display text-2xl font-bold uppercase text-white">Contact us</h2>
            {sent ? <p className="mt-4 text-accent-300" data-testid="contact-sent">{sent}</p> : (
              <form onSubmit={contact} className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name"><input name="name" required maxLength={80} className={inputCls} /></Field>
                  <Field label="Email"><input name="email" type="email" required className={inputCls} /></Field>
                </div>
                <Field label="Message"><textarea name="message" required minLength={10} maxLength={2000} rows={4} className={inputCls} /></Field>
                <FormError message={error} />
                <button type="submit" className="btn-secondary">Send message</button>
              </form>
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-4 font-display text-2xl font-bold uppercase text-white">Common questions</h2>
          <div className="space-y-2" data-testid="faq">
            {faq.map((f) => (
              <details key={f.q} className="card group p-4">
                <summary className="cursor-pointer list-none font-semibold text-white marker:hidden">
                  <span className="mr-2 text-accent-400 group-open:hidden">+</span><span className="mr-2 hidden text-accent-400 group-open:inline">−</span>{f.q}
                </summary>
                <p className="mt-2 text-chalk/80">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
