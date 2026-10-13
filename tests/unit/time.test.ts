import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTime, localDateKey, localInputToUtcIso, utcIsoToLocalInput } from "../../lib/time.ts";

test("Lagos local input converts to UTC (UTC+1, no DST)", () => {
  assert.equal(localInputToUtcIso("2026-10-18T08:00", "Africa/Lagos"), "2026-10-18T07:00:00.000Z");
  assert.equal(localInputToUtcIso("2026-01-01T00:30", "Africa/Lagos"), "2025-12-31T23:30:00.000Z");
});

test("round-trips through datetime-local values", () => {
  const iso = "2026-10-18T07:00:00.000Z";
  assert.equal(utcIsoToLocalInput(iso, "Africa/Lagos"), "2026-10-18T08:00");
  assert.equal(localInputToUtcIso(utcIsoToLocalInput(iso, "Africa/Lagos"), "Africa/Lagos"), iso);
});

test("handles a DST zone too", () => {
  assert.equal(localInputToUtcIso("2026-07-05T10:00", "Europe/London"), "2026-07-05T09:00:00.000Z");
  assert.equal(localInputToUtcIso("2026-12-05T10:00", "Europe/London"), "2026-12-05T10:00:00.000Z");
});

test("rejects malformed input", () => {
  assert.equal(localInputToUtcIso("tomorrow", "Africa/Lagos"), null);
  assert.equal(localInputToUtcIso("", "Africa/Lagos"), null);
});

test("local calendar day follows the church time zone", () => {
  // 23:30 UTC on the 17th is already the 18th in Lagos.
  assert.equal(localDateKey(new Date("2026-10-17T23:30:00Z"), "Africa/Lagos"), "2026-10-18");
});

test("formats times for people", () => {
  assert.match(formatTime("2026-10-18T07:05:00Z", "Africa/Lagos"), /^8:05 am$/);
});
