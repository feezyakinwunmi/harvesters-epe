import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/*
  Decorative artwork, drawn in code so it stays crisp, themable and tiny.
  The motif is the harvest: wheat stalks, sunrise rays and a gold glow.
  Everything here is aria-hidden; none of it carries meaning.
*/

type StalkProps = { x: number; base: number; height: number; grains?: number; delay?: number; duration?: number; opacity?: number; lean?: number };

/** One wheat stalk: a curved stem with paired grains and a single top grain. */
function Stalk({ x, base, height, grains = 7, delay = 0, duration = 6, opacity = 1, lean = 0 }: StalkProps) {
  const top = base - height;
  const headStart = top + 6;
  const step = 8.5;
  return (
    <g className="hc-sway" style={{ "--d": `${delay}s`, "--dur": `${duration}s` } as CSSProperties} opacity={opacity}>
      <path d={`M${x} ${base} Q${x + lean} ${base - height / 2} ${x} ${top + grains * step}`} stroke="#9c7c34" strokeOpacity="0.8" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {Array.from({ length: grains }, (_, i) => {
        const y = headStart + i * step;
        return (
          <g key={i}>
            <ellipse cx={x - 4} cy={y + 2} rx="2.6" ry="6" transform={`rotate(-28 ${x - 4} ${y + 2})`} fill="#c4a35a" />
            <ellipse cx={x + 4} cy={y + 2} rx="2.6" ry="6" transform={`rotate(28 ${x + 4} ${y + 2})`} fill="#c4a35a" />
          </g>
        );
      })}
      <ellipse cx={x} cy={top + 2} rx="2.4" ry="6" fill="#c4a35a" />
      <path d={`M${x} ${top - 2} L${x} ${top - 18}`} stroke="var(--gold)" strokeWidth="0.8" opacity="0.6" />
    </g>
  );
}

const FIELD: StalkProps[] = [
  { x: 40, base: 320, height: 150, delay: 0.2, opacity: 0.35 },
  { x: 78, base: 320, height: 200, delay: 1.1, opacity: 0.55, lean: 6 },
  { x: 112, base: 320, height: 175, delay: 0.6, opacity: 0.4 },
  { x: 150, base: 320, height: 240, delay: 1.7, opacity: 0.9, lean: -8, grains: 8 },
  { x: 188, base: 320, height: 205, delay: 0.3, opacity: 0.7 },
  { x: 222, base: 320, height: 260, delay: 2.2, opacity: 1, lean: 10, grains: 9 },
  { x: 258, base: 320, height: 190, delay: 0.9, opacity: 0.6 },
  { x: 292, base: 320, height: 228, delay: 1.4, opacity: 0.85, lean: -6, grains: 8 },
  { x: 330, base: 320, height: 165, delay: 0.5, opacity: 0.45 },
  { x: 364, base: 320, height: 212, delay: 2.6, opacity: 0.7, lean: 7 },
  { x: 400, base: 320, height: 150, delay: 1.0, opacity: 0.35 },
];

/** A small field of swaying wheat. Sits at the bottom of dark hero bands. */
export function WheatField({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 440 320" className={cn("pointer-events-none", className)} fill="none" aria-hidden>
      {FIELD.map((s, i) => <Stalk key={i} {...s} />)}
    </svg>
  );
}

/** A single stalk, used as an ornament beside headings and in the logo. */
export function WheatSprig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 110" className={cn("pointer-events-none", className)} fill="none" aria-hidden>
      <Stalk x={15} base={108} height={92} grains={6} />
    </svg>
  );
}

/** Concentric rings and fine rays, like a slow sunrise. */
export function SunRays({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={cn("pointer-events-none", className)} fill="none" aria-hidden>
      <g className="hc-spin-slow" stroke="#b08d3e">
        {Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * Math.PI * 2;
          const r1 = 150;
          const r2 = i % 2 ? 230 : 280;
          return (
            <line
              key={i}
              x1={300 + Math.cos(a) * r1}
              y1={300 + Math.sin(a) * r1}
              x2={300 + Math.cos(a) * r2}
              y2={300 + Math.sin(a) * r2}
              strokeWidth="0.7"
              strokeOpacity={i % 2 ? 0.18 : 0.3}
            />
          );
        })}
      </g>
      {[90, 130, 170, 290].map((r, i) => (
        <circle key={r} cx="300" cy="300" r={r} stroke="#b08d3e" strokeOpacity={0.12 + i * 0.03} strokeWidth="0.8" strokeDasharray={i === 3 ? "2 6" : undefined} />
      ))}
    </svg>
  );
}

/** The brand mark: an H formed of two stalks and a crossbar, in a gold-edged tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden>
      <rect width="40" height="40" rx="11" fill="#0b0b0a" />
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="10.25" stroke="#b08d3e" strokeOpacity="0.55" strokeWidth="1.5" />
      <path d="M14 11v19M26 11v19M14 21h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="14" cy="8.5" rx="1.6" ry="2.8" fill="#c4a35a" />
      <ellipse cx="26" cy="8.5" rx="1.6" ry="2.8" fill="#c4a35a" />
      <circle cx="31" cy="30" r="2" fill="#c4a35a" />
    </svg>
  );
}

/** A believable but meaningless QR pattern for illustrations. */
export function QrGlyph({ className, color = "currentColor" }: { className?: string; color?: string }) {
  const cells: Array<[number, number]> = [];
  // Deterministic pseudo-random fill
  let seed = 7;
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      const inFinder = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
      if (inFinder) continue;
      seed = (seed * 9301 + 49297) % 233280;
      if (seed / 233280 > 0.52) cells.push([x, y]);
    }
  }
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x + 0.5} y={y + 0.5} width="6" height="6" rx="1.2" stroke={color} strokeWidth="1" fill="none" />
      <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.6" fill={color} />
    </g>
  );
  return (
    <svg viewBox="0 0 21 21" className={className} aria-hidden shapeRendering="crispEdges">
      {finder(0, 0)}
      {finder(14, 0)}
      {finder(0, 14)}
      {cells.map(([x, y]) => <rect key={`${x}.${y}`} x={x} y={y} width="1" height="1" fill={color} />)}
    </svg>
  );
}

/** Line, diamond, line: a quiet gold divider. */
export function Ornament({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-gold", className)} aria-hidden>
      <span className="h-px w-8 bg-current opacity-60" />
      <svg viewBox="0 0 10 10" className="size-2.5"><path d="M5 0l5 5-5 5-5-5z" fill="currentColor" /></svg>
      <span className="h-px w-8 bg-current opacity-60" />
    </span>
  );
}

/** Generated cover for posts without a photo: dark, rings and a sprig, varied by seed. */
export function CoverArt({ seed, className }: { seed: string; className?: string }) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const cx = 30 + (h % 40);
  const cy = 20 + ((h >> 5) % 50);
  return (
    <div className={cn("relative overflow-hidden bg-night", className)} aria-hidden>
      <div className="hc-dots absolute inset-0 opacity-60" />
      <div
        className="absolute size-[140%] rounded-full"
        style={{ left: `${cx - 70}%`, top: `${cy - 70}%`, background: "radial-gradient(circle, rgb(176 141 62 / 0.38), transparent 55%)" }}
      />
      <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" fill="none">
        {[18, 34, 52, 74].map((r, i) => (
          <circle key={r} cx={cx * 2} cy={cy * 1.2} r={r} stroke="#b08d3e" strokeOpacity={0.35 - i * 0.07} strokeWidth="0.6" />
        ))}
      </svg>
      <WheatSprig className="absolute bottom-0 right-[12%] h-[78%] opacity-90" />
      <WheatSprig className="absolute bottom-0 right-[20%] h-[56%] opacity-50" />
    </div>
  );
}
