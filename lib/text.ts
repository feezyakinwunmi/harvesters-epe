// Small, pure helpers for phones, masking, CSV, slugs and redirects.
// Unit tested in tests/unit/text.test.ts.

/**
 * Normalises Nigerian numbers to E.164 (+234…). Other international numbers
 * written with a leading + are kept. Returns null when it can't be a phone.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  if (hasPlus) return `+${digits}`;
  if (digits.startsWith("234") && digits.length === 13) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.length === 10 && /^[789]/.test(digits)) return `+234${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  return null;
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email || !email.includes("@")) return null;
  const [local, domain] = email.split("@") as [string, string];
  const visible = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${visible}${"•".repeat(Math.max(2, Math.min(5, local.length - visible.length)))}@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return `•••• ${digits.slice(-4)}`;
}

/** Internal synthetic e-mail addresses (members who gave no email) are never deliverable. */
export const SYNTHETIC_EMAIL_DOMAIN = "no-email.harvesters-epe.invalid";

export function syntheticEmailFor(id: string): string {
  return `m-${id.toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function isSyntheticEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`);
}

/**
 * Only allow same-site relative paths as redirect targets.
 * Blocks protocol-relative (//evil.com), backslash tricks and absolute URLs.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(value)) return fallback;
  if (value.length > 512) return fallback;
  return value;
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Escapes a CSV cell and neutralises spreadsheet formula injection. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv<T>(rows: readonly T[], columns: ReadonlyArray<{ header: string; value: (row: T) => unknown }>): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => csvCell(c.value(row))).join(","));
  // BOM so Excel opens UTF-8 names correctly.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Strip characters that would break a PostgREST `or=(...)` filter. */
export function sanitizeSearch(q: string | null | undefined, max = 60): string {
  if (!q) return "";
  return q.replace(/[(),.*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function initials(first: string | null | undefined, last: string | null | undefined): string {
  return `${(first ?? "").trim().charAt(0)}${(last ?? "").trim().charAt(0)}`.toUpperCase() || "?";
}
