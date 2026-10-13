import { formatDate } from "@/lib/time";

type Point = { id: string; title: string; starts_at: string; physical: number; online: number };

/**
 * Stacked bars (in person + online) for the last services. Pure SVG, no
 * chart library. A visually hidden table carries the same numbers for
 * screen readers.
 */
export function TrendChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return <p className="px-5 py-12 text-center text-sm text-muted">Attendance will chart here after your first service with check-ins.</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.physical + d.online));
  const niceMax = Math.ceil(max / 10) * 10 || 10;
  const W = 640;
  const H = 220;
  const pad = { top: 12, right: 8, bottom: 34, left: 36 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const slot = innerW / data.length;
  const barW = Math.min(36, slot * 0.6);
  const y = (v: number) => pad.top + innerH - (v / niceMax) * innerH;
  const ticks = [0, niceMax / 2, niceMax];

  return (
    <div className="px-3 pb-3 pt-4">
      <div className="mb-2 flex gap-4 px-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[2px] bg-ink" aria-hidden /> In person</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[2px] bg-accent" aria-hidden /> Online</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Attendance for recent services">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--subtle)">{t}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.left + slot * i + slot / 2;
          const physTop = y(d.physical);
          const onlineTop = y(d.physical + d.online);
          return (
            <g key={d.id}>
              <title>{`${d.title}, ${formatDate(d.starts_at)}: ${d.physical} in person, ${d.online} online`}</title>
              <rect x={cx - barW / 2} y={physTop} width={barW} height={pad.top + innerH - physTop} fill="var(--ink)" rx="2" />
              {d.online > 0 ? <rect x={cx - barW / 2} y={onlineTop} width={barW} height={physTop - onlineTop} fill="var(--accent)" rx="2" /> : null}
              <text x={cx} y={H - 14} textAnchor="middle" fontSize="11" fill="var(--muted)">
                {new Date(d.starts_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE || "Africa/Lagos" })}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Attendance for recent services</caption>
        <thead><tr><th>Service</th><th>Date</th><th>In person</th><th>Online</th></tr></thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.id}><td>{d.title}</td><td>{formatDate(d.starts_at)}</td><td>{d.physical}</td><td>{d.online}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
