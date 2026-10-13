// Time-zone helpers. Admins type times in church-local time (Africa/Lagos by
// default); the database stores UTC timestamptz. Pure — unit tested.

export const DEFAULT_TIMEZONE = "Africa/Lagos";

export function appTimezone(): string {
  return process.env.NEXT_PUBLIC_APP_TIMEZONE || DEFAULT_TIMEZONE;
}

function offsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** "2026-10-18T08:30" interpreted in `timeZone` → ISO UTC string. Returns null if invalid. */
export function localInputToUtcIso(value: string | null | undefined, timeZone = appTimezone()): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const naiveUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0));
  if (Number.isNaN(naiveUtc)) return null;
  // Two passes handle DST boundaries in zones that have them.
  let guess = naiveUtc - offsetMinutes(new Date(naiveUtc), timeZone) * 60000;
  guess = naiveUtc - offsetMinutes(new Date(guess), timeZone) * 60000;
  return new Date(guess).toISOString();
}

/** ISO UTC → "YYYY-MM-DDTHH:mm" in `timeZone`, for <input type="datetime-local">. */
export function utcIsoToLocalInput(iso: string | null | undefined, timeZone = appTimezone()): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() + offsetMinutes(date, timeZone) * 60000);
  return local.toISOString().slice(0, 16);
}

/** Calendar date (YYYY-MM-DD) of `date` in `timeZone`. */
export function localDateKey(date: Date = new Date(), timeZone = appTimezone()): string {
  return utcIsoToLocalInput(date.toISOString(), timeZone).slice(0, 10);
}

export function addMinutesIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = timeZone + JSON.stringify(options);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-NG", { timeZone, ...options });
    fmtCache.set(key, f);
  }
  return f;
}

export function formatDate(iso: string | null | undefined, timeZone = appTimezone()): string {
  if (!iso) return "—";
  return fmt(timeZone, { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function formatLongDate(iso: string | null | undefined, timeZone = appTimezone()): string {
  if (!iso) return "—";
  return fmt(timeZone, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export function formatTime(iso: string | null | undefined, timeZone = appTimezone()): string {
  if (!iso) return "—";
  return fmt(timeZone, { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso)).replace(/\s?([ap]m)$/i, (_, p: string) => ` ${p.toLowerCase()}`);
}

export function formatDateTime(iso: string | null | undefined, timeZone = appTimezone()): string {
  if (!iso) return "—";
  return `${formatDate(iso, timeZone)}, ${formatTime(iso, timeZone)}`;
}

/** A plain calendar date (YYYY-MM-DD, no time zone) for display. */
export function formatCalendarDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return fmt("UTC", { day: "numeric", month: "short", year: "numeric" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function relativeFromNow(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  return rtf.format(Math.round(diff / 86_400_000), "day");
}

/** Pieces for a calendar-style date block. */
export function dateParts(iso: string, timeZone = appTimezone()): { weekday: string; day: string; month: string } {
  const d = new Date(iso);
  return {
    weekday: fmt(timeZone, { weekday: "short" }).format(d),
    day: fmt(timeZone, { day: "numeric" }).format(d),
    month: fmt(timeZone, { month: "short" }).format(d),
  };
}
