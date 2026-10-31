// The FIFA-style gold card. Every number on it was measured (video) or taken (tests); empty slots show a dash.
import type { FullCard } from "@/lib/main";

const POS: Record<string, string> = { Goalkeeper: "GK", Defender: "DEF", Midfielder: "MID", Forward: "FWD" };

export function GoldCard({ card, name }: { card: FullCard; name: string }) {
  const skill = (k: string) => card.skills.find((s) => s.key === k)?.value ?? null;
  const attrs: [string, number | null][] = [
    ["TCH", skill("TCH")], ["RHY", skill("RHY")], ["CTL", skill("CTL")],
    ["MND", card.mindset.score], ["REA", card.reaction?.rating ?? null], ["LOG", card.logic?.rating ?? null],
  ];
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="relative mx-auto w-full max-w-[300px]" data-testid="gold-card"
      role="img" aria-label={`Player card for ${name}: overall ${card.overall ?? "not rated yet"}. ${attrs.map(([k, v]) => `${k} ${v ?? "not measured"}`).join(", ")}.`}>
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-accent-400/25 blur-2xl" aria-hidden="true" />
      <div className="relative aspect-[3/4.3] overflow-hidden text-ink-950 [clip-path:polygon(50%_0,100%_7%,100%_88%,50%_100%,0_88%,0_7%)]"
        style={{ background: "linear-gradient(155deg, rgb(var(--accent-200)) 0%, rgb(var(--accent-400)) 38%, rgb(var(--accent-600)) 100%)" }}>
        <div className="absolute inset-0 opacity-25 [background:repeating-linear-gradient(115deg,transparent_0_14px,rgb(255_255_255/.35)_14px_15px)]" aria-hidden="true" />
        <div className="absolute inset-x-0 top-[9%] flex items-start justify-between px-[11%]">
          <div className="text-center leading-none">
            <p className="font-display text-5xl font-bold tracking-[-0.05em]">{card.overall ?? "–"}</p>
            <p className="mt-1 font-mono text-xs font-medium">{POS[card.physical.position ?? ""] ?? "PLR"}</p>
            {card.physical.shirt_number && <p className="mt-1 font-mono text-[10px] opacity-70">#{card.physical.shirt_number}</p>}
          </div>
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-ink-950/90 font-display text-3xl font-semibold text-accent-300 shadow-inner ring-4 ring-white/30">{initials}</span>
        </div>
        <p className="absolute inset-x-0 top-[47%] truncate px-6 text-center font-display text-xl font-bold uppercase tracking-tight">{name}</p>
        <div className="absolute inset-x-[12%] top-[56%] border-t border-ink-950/25" />
        <dl className="absolute inset-x-[12%] top-[60%] grid grid-cols-2 gap-x-6 gap-y-1.5">
          {attrs.map(([k, v]) => (
            <div key={k} className="flex flex-row-reverse items-baseline justify-between gap-2">
              <dt className="font-mono text-xs font-medium opacity-80">{k}</dt>
              <dd className="font-display text-xl font-bold">{v ?? "–"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
