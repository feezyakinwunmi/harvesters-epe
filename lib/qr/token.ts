// QR / online-link tokens and in-person recovery codes.
// Pure module (node:crypto only) so it can be unit-tested without Next.js.
//
// Token design
//   token = base64url( HMAC-SHA256(secret, `${kind}:${sessionId}:${nonce}`) )   (43 chars, 256 bits)
//   DB stores sha256_hex(token) and the random nonce — never the token.
//   The server can recompute the identical token for reprinting; someone with
//   a copy of the database but not the secret cannot.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type TokenKind = "physical" | "online";

export const MIN_SECRET_LENGTH = 32;

export function assertStrongSecret(secret: string | undefined, name = "QR_TOKEN_SECRET"): string {
  if (!secret || secret.length < MIN_SECRET_LENGTH || /^change-me/.test(secret)) {
    throw new Error(`${name} must be set to at least ${MIN_SECRET_LENGTH} random characters.`);
  }
  return secret;
}

export function newNonce(): string {
  return randomBytes(18).toString("base64url");
}

export function deriveSessionToken(secret: string, kind: TokenKind, sessionId: string, nonce: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) throw new Error("sessionId must be a UUID");
  if (!nonce) throw new Error("nonce is required");
  return createHmac("sha256", secret).update(`${kind}:${sessionId.toLowerCase()}:${nonce}`).digest("base64url");
}

/** SHA-256 hex digest — identical to Postgres encode(sha256(convert_to(t,'UTF8')),'hex'). */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hashToken(token: string): string {
  return sha256Hex(token);
}

/** Shape check only; the database decides whether a token is real. */
export function looksLikeToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{32,128}$/.test(value);
}

// ── In-person recovery codes ───────────────────────────────────────
// 8 characters from a 32-symbol alphabet without look-alikes (no 0/O, 1/I).
// 32^8 ≈ 1.1 × 10^12 combinations; codes expire in minutes and are single use.
export const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const RECOVERY_CODE_LENGTH = 8;

export function generateRecoveryCode(): string {
  // 256 is a multiple of 32, so `byte % 32` is unbiased.
  const bytes = randomBytes(RECOVERY_CODE_LENGTH);
  let out = "";
  for (const b of bytes) out += RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length];
  return out;
}

export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export function isWellFormedRecoveryCode(input: string): boolean {
  const code = normalizeRecoveryCode(input);
  if (code.length !== RECOVERY_CODE_LENGTH) return false;
  for (const ch of code) if (!RECOVERY_ALPHABET.includes(ch)) return false;
  return true;
}

export function hashRecoveryCode(input: string): string {
  return sha256Hex(normalizeRecoveryCode(input));
}

/** Display as ABCD-EFGH for reading aloud. */
export function formatRecoveryCode(code: string): string {
  const c = normalizeRecoveryCode(code);
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
