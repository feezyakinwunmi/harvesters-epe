import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertStrongSecret,
  deriveSessionToken,
  formatRecoveryCode,
  generateRecoveryCode,
  hashRecoveryCode,
  hashToken,
  isWellFormedRecoveryCode,
  looksLikeToken,
  newNonce,
  normalizeRecoveryCode,
  RECOVERY_ALPHABET,
} from "../../lib/qr/token.ts";

const SECRET = "x".repeat(48);
const SESSION = "f0000000-0000-4000-8000-000000000001";

test("token is deterministic for the same session + nonce (reprint gives the same QR)", () => {
  const nonce = newNonce();
  assert.equal(deriveSessionToken(SECRET, "physical", SESSION, nonce), deriveSessionToken(SECRET, "physical", SESSION, nonce));
});

test("physical and online tokens differ for the same session", () => {
  const nonce = newNonce();
  assert.notEqual(deriveSessionToken(SECRET, "physical", SESSION, nonce), deriveSessionToken(SECRET, "online", SESSION, nonce));
});

test("each session gets a unique token", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 500; i++) {
    const id = crypto.randomUUID();
    seen.add(deriveSessionToken(SECRET, "physical", id, newNonce()));
  }
  assert.equal(seen.size, 500);
});

test("a different secret gives a different token (DB leak alone cannot rebuild QRs)", () => {
  const nonce = newNonce();
  assert.notEqual(deriveSessionToken(SECRET, "physical", SESSION, nonce), deriveSessionToken("y".repeat(48), "physical", SESSION, nonce));
});

test("tokens are URL-safe, 256-bit and pass the shape check used by the DB", () => {
  const t = deriveSessionToken(SECRET, "physical", SESSION, newNonce());
  assert.equal(t.length, 43);
  assert.ok(looksLikeToken(t));
  assert.ok(!looksLikeToken("short"));
  assert.ok(!looksLikeToken("x".repeat(40) + "'; drop"));
});

test("hash matches Postgres encode(sha256(convert_to(t,'UTF8')),'hex')", () => {
  // Vector produced by PostgreSQL 16 for the test fixture used in supabase/tests.
  assert.equal(
    hashToken("TOKEN_PHYSICAL_OPEN_aaaaaaaaaaaaaaaaaaaaaa"),
    "6b1acc6c46ffece586c01dc74f0e426ea3cd3cce38503e5a9fe60d27d5bdcc9b",
  );
  assert.equal(hashRecoveryCode("abcd-2345"), "a00d76646eba91b057841554d5c8334f498dc592ed744bce404f21fe271cd36e");
});

test("rejects non-UUID session ids", () => {
  assert.throws(() => deriveSessionToken(SECRET, "physical", "1 or 1=1", "n"));
});

test("weak or placeholder secrets are refused", () => {
  assert.throws(() => assertStrongSecret(undefined));
  assert.throws(() => assertStrongSecret("short"));
  assert.throws(() => assertStrongSecret("change-me-" + "x".repeat(40)));
  assert.equal(assertStrongSecret(SECRET), SECRET);
});

test("recovery codes use the unambiguous alphabet and normalise for typing", () => {
  for (let i = 0; i < 200; i++) {
    const code = generateRecoveryCode();
    assert.equal(code.length, 8);
    for (const ch of code) assert.ok(RECOVERY_ALPHABET.includes(ch));
    assert.ok(isWellFormedRecoveryCode(formatRecoveryCode(code).toLowerCase()));
  }
  assert.equal(normalizeRecoveryCode(" abcd-efgh "), "ABCDEFGH");
  assert.ok(!isWellFormedRecoveryCode("ABCD-EFG0")); // 0 is not in the alphabet
  assert.ok(!isWellFormedRecoveryCode("ABC"));
});
