/** The orchestrated moment: a gold-edged mark draws in while rays burst behind it. */
export function CheckMark() {
  return (
    <div className="relative size-24" aria-hidden>
      <svg viewBox="0 0 120 120" className="hc-check-burst absolute -inset-8 size-40" fill="none">
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={60 + Math.cos(a) * 40}
              y1={60 + Math.sin(a) * 40}
              x2={60 + Math.cos(a) * 54}
              y2={60 + Math.sin(a) * 54}
              stroke="#b08d3e"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <span className="hc-pulse-ring absolute inset-0 rounded-full border-2 border-gold" />
      <div className="hc-check-ring relative flex size-24 items-center justify-center rounded-full bg-ink shadow-[0_0_0_6px_var(--accent-soft),0_20px_40px_-12px_rgb(0_0_0/0.5)]">
        <svg viewBox="0 0 32 32" className="size-11" fill="none">
          <path className="hc-check-path" d="M8 16.5l5.5 5.5L24 11" stroke="#d4b876" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
