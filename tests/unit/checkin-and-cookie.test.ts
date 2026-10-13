import { test } from "node:test";
import assert from "node:assert/strict";
import { checkInCopy, needsIdentity, parseCheckInResult } from "../../lib/checkin/status.ts";
import { decodeDeviceCookie, encodeDeviceCookie, shortDisplayName } from "../../lib/auth/device-cookie.ts";

test("parses a successful check-in", () => {
  const r = parseCheckInResult({
    status: "checked_in", mode: "physical", service_title: "Sunday Service",
    checked_in_at: "2026-10-18T08:05:00Z", recorded_mode: "physical", member_first_name: "Ada",
  });
  assert.equal(r.status, "checked_in");
  assert.equal(r.serviceTitle, "Sunday Service");
  assert.equal(checkInCopy(r).title, "You're in, Ada.");
  assert.equal(checkInCopy(r).tone, "success");
});

test("already-checked-in keeps the recorded time", () => {
  const r = parseCheckInResult({ status: "already_checked_in", checked_in_at: "2026-10-18T08:05:00Z" });
  assert.equal(r.checkedInAt, "2026-10-18T08:05:00Z");
  assert.match(checkInCopy(r).title, /already checked in/);
});

test("expired session copy points to an usher and never claims success", () => {
  const copy = checkInCopy(parseCheckInResult({ status: "closed" }));
  assert.equal(copy.tone, "warning");
  assert.match(copy.body, /usher/);
});

test("unknown or malformed RPC output is treated as invalid", () => {
  assert.equal(parseCheckInResult(null).status, "invalid");
  assert.equal(parseCheckInResult({ status: "hacked" }).status, "invalid");
  assert.equal(parseCheckInResult({ status: "checked_in", mode: "teleport" }).mode, null);
});

test("identity is requested only for the right statuses", () => {
  assert.equal(needsIdentity("auth_required"), true);
  assert.equal(needsIdentity("reauth_required"), true);
  assert.equal(needsIdentity("needs_registration"), true);
  assert.equal(needsIdentity("closed"), false);
  assert.equal(needsIdentity("checked_in"), false);
});

const SECRET = "s".repeat(48);
const UID = "b0000000-0000-4000-8000-000000000001";

test("device cookie round-trips", () => {
  const v = encodeDeviceCookie({ uid: UID, name: "Ada O.", hint: "ad•••@gmail.com" }, SECRET);
  const d = decodeDeviceCookie(v, SECRET);
  assert.equal(d?.uid, UID);
  assert.equal(d?.name, "Ada O.");
});

test("tampered device cookie is rejected", () => {
  const v = encodeDeviceCookie({ uid: UID, name: "Ada O.", hint: null }, SECRET);
  const [data, sig] = v.split(".") as [string, string];
  const forged = Buffer.from(JSON.stringify({ v: 1, uid: "a0000000-0000-4000-8000-000000000001", name: "Admin", hint: null, exp: 9e9 })).toString("base64url");
  assert.equal(decodeDeviceCookie(`${forged}.${sig}`, SECRET), null);
  assert.equal(decodeDeviceCookie(`${data}.${sig}x`, SECRET), null);
  assert.equal(decodeDeviceCookie(v, "t".repeat(48)), null);
  assert.equal(decodeDeviceCookie("garbage", SECRET), null);
});

test("device cookie expires after 12 months", () => {
  const issued = Date.UTC(2026, 0, 1);
  const v = encodeDeviceCookie({ uid: UID, name: "Ada O.", hint: null }, SECRET, issued);
  assert.ok(decodeDeviceCookie(v, SECRET, issued + 364 * 864e5));
  assert.equal(decodeDeviceCookie(v, SECRET, issued + 366 * 864e5), null);
});

test("short display name exposes only first name and last initial", () => {
  assert.equal(shortDisplayName("Ada", "okafor"), "Ada O.");
  assert.equal(shortDisplayName(" Ada ", ""), "Ada");
});
