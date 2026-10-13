import "server-only";
import QRCode from "qrcode";
import { publicEnv } from "@/lib/env";
import { qrTokenSecret } from "@/lib/server-env";
import { deriveSessionToken, hashToken, newNonce, type TokenKind } from "@/lib/qr/token";

/** Fresh nonce + token hash for a new session. The raw token is not stored. */
export function mintSessionToken(sessionId: string, kind: TokenKind) {
  const nonce = newNonce();
  const token = deriveSessionToken(qrTokenSecret(), kind, sessionId, nonce);
  return { nonce, hash: hashToken(token) };
}

/** Recompute the check-in URL for an existing session (for preview / reprint). */
export function checkInUrl(sessionId: string, kind: TokenKind, nonce: string, expectedHash?: string | null): string {
  const token = deriveSessionToken(qrTokenSecret(), kind, sessionId, nonce);
  if (expectedHash && hashToken(token) !== expectedHash) {
    // QR_TOKEN_SECRET changed since this session was created.
    throw new Error("QR token secret mismatch: this session's QR code can no longer be regenerated. Create a new session.");
  }
  return `${publicEnv.siteUrl}/c/${token}`;
}

export async function qrSvg(url: string, size = 320): Promise<string> {
  return QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 2, width: size, color: { dark: "#000000", light: "#ffffff" } });
}

export async function qrPng(url: string, size = 1200): Promise<Buffer> {
  return QRCode.toBuffer(url, { type: "png", errorCorrectionLevel: "M", margin: 2, width: size });
}
