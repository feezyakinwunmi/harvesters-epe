import "server-only";
import { assertStrongSecret } from "@/lib/qr/token";

// Server-only secrets. Importing this file from a Client Component fails the build.

export function serviceRoleKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). See .env.example.");
  return key;
}

export function qrTokenSecret(): string {
  return assertStrongSecret(process.env.QR_TOKEN_SECRET, "QR_TOKEN_SECRET");
}

export function deviceCookieSecret(): string {
  return assertStrongSecret(process.env.DEVICE_COOKIE_SECRET, "DEVICE_COOKIE_SECRET");
}

export { appTimezone } from "@/lib/time";
