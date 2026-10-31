"use client";

// The AI assistant, docked on every signed-in Main page. Same endpoint as the help page (/support/chat): Gemini
// answers from the FAQ only, with an FAQ-matching fallback, and refuses off-topic questions.
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";

type Msg = { role: "user" | "model"; text: string };
const STARTERS = ["How is my player card rated?", "How do I join my coach's room?", "Why was my video rejected?"];

export function ChatPanel({ className = "", onClose }: { className?: string; onClose?: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "model", text: "Hi! Ask me about your reports, tests, training plan or rooms." }]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history = msgs.slice(1).map((m) => ({ role: m.role, text: m.text }));
    setMsgs((m) => [...m, { role: "user", text: q }]);
    if (input.current) input.current.value = "";
    setBusy(true);
    try {
      const r = await api<{ reply: string }>("/support/chat", { method: "POST", json: { message: q, history, edition: "main" } });
      setMsgs((m) => [...m, { role: "model", text: r.reply }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "model", text: (e as Error).message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex flex-col ${className}`} data-testid="chat">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="h-4 w-4 text-accent-300" aria-hidden="true" /> PitchIQ assistant</p>
        {onClose && <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-chalk/70 hover:text-white" aria-label="Close assistant"><X className="h-4 w-4" aria-hidden="true" /></button>}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {msgs.map((m, i) => (
          <p key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "ml-auto bg-gradient-to-r from-accent-300 to-accent-400 text-ink-950" : "bg-white/[0.06] text-chalk"}`}
            data-testid={m.role === "model" && i > 0 ? "chat-reply" : undefined}>
            {m.text}
          </p>
        ))}
        {busy && <p className="flex items-center gap-2 text-sm text-chalk/60"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Thinking…</p>}
        {msgs.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {STARTERS.map((s) => <button key={s} type="button" onClick={() => ask(s)} className="chip hover:border-accent-400/40">{s}</button>)}
          </div>
        )}
        <div ref={end} />
      </div>
      <form className="flex gap-2 border-t border-white/[0.06] p-3" onSubmit={(e) => { e.preventDefault(); ask(input.current?.value ?? ""); }}>
        <input ref={input} maxLength={500} placeholder="Ask anything about PitchIQ" className="m-input !rounded-xl !py-2.5" aria-label="Your question" data-testid="chat-input" />
        <button type="submit" disabled={busy} className="btn-primary !rounded-xl !px-3.5" aria-label="Send"><Send className="h-4 w-4" aria-hidden="true" /></button>
      </form>
    </div>
  );
}

export function ChatDock() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && <ChatPanel onClose={() => setOpen(false)} className="glass fixed bottom-24 right-3 z-50 h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-1.5rem))] !p-0 lg:bottom-6 lg:right-6" />}
      {!open && (
        <button type="button" onClick={() => setOpen(true)} data-testid="chat-open"
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-300 to-accent-500 px-4 py-3 text-sm font-semibold text-ink-950 shadow-glow transition hover:brightness-110 lg:bottom-6 lg:right-6">
          <Sparkles className="h-4 w-4" aria-hidden="true" /> Ask PitchIQ
        </button>
      )}
    </>
  );
}
