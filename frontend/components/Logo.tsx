// Wordmark: a ball's arc over a pitch line, then "PitchIQ".
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M4 25 Q16 0 28 25" fill="none" stroke="rgb(var(--accent-400))" strokeWidth="2.5" strokeDasharray="3 3" />
        <circle cx="16" cy="10" r="4.5" fill="#ffffff" />
        <line x1="2" y1="27" x2="30" y2="27" stroke="#ffffff" strokeOpacity=".5" strokeWidth="2" />
      </svg>
      <span className="font-display text-2xl font-extrabold uppercase tracking-tight text-white">
        Pitch<span className="text-accent-400">IQ</span>
      </span>
    </span>
  );
}
