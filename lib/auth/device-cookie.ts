// "Remember this device" cookie.
//
// Lets the check-in page say "Continue as Ada O." after the Supabase session
// has expired. It is NOT an authentication credential: continuing still
// requires a one-time code (email/SMS) or an in-person usher code.
// The cookie is HMAC-signed so its contents can't be tampered with, httpOnly,
// and contains only a first name, last initial, the auth user id and a masked
// contact hint.
// Pure module (node:crypto only) — unit tested.
import { createHmac, timingSafeEqual } from "node:crypto";

export const DEVICE_COOKIE_NAME = "hc_device";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 12 months

export type DeviceIdentity = {
  v: 1;
  uid: string; // Supabase auth user id
  name: string; // "Ada O."
  hint: string | null; // "a***@gmail.com" — null when no deliverable email
  exp: number; // unix seconds
};

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function encodeDeviceCookie(identity: Omit<DeviceIdentity, "v" | "exp">, secret: string, now = Date.now()): string {
  const payload: DeviceIdentity = {
    v: 1,
    uid: identity.uid,
    name: identity.name.slice(0, 60),
    hint: identity.hint,
    exp: Math.floor(now / 1000) + DEVICE_COOKIE_MAX_AGE,
  };
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${data}.${sign(data, secret)}`;
}

export function decodeDeviceCookie(value: string | undefined | null, secret: string, now = Date.now()): DeviceIdentity | null {
  if (!value || value.length > 2048) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const data = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = sign(data, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Partial<DeviceIdentity>;
    if (parsed.v !== 1 || typeof parsed.uid !== "string" || typeof parsed.name !== "string" || typeof parsed.exp !== "number") {
      return null;
    }
    if (!/^[0-9a-f-]{36}$/i.test(parsed.uid)) return null;
    if (parsed.exp * 1000 < now) return null;
    return { v: 1, uid: parsed.uid, name: parsed.name, hint: typeof parsed.hint === "string" ? parsed.hint : null, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function shortDisplayName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const initial = lastName.trim().charAt(0).toUpperCase();
  return initial ? `${first} ${initial}.` : first;
}
