import { test } from "node:test";
import assert from "node:assert/strict";
import {
  csvCell,
  isSyntheticEmail,
  maskEmail,
  maskPhone,
  normalizePhone,
  safeNextPath,
  sanitizeSearch,
  slugify,
  syntheticEmailFor,
  toCsv,
} from "../../lib/text.ts";

test("normalises Nigerian phone numbers", () => {
  assert.equal(normalizePhone("0803 123 4567"), "+2348031234567");
  assert.equal(normalizePhone("+234 803 123 4567"), "+2348031234567");
  assert.equal(normalizePhone("2348031234567"), "+2348031234567");
  assert.equal(normalizePhone("8031234567"), "+2348031234567");
  assert.equal(normalizePhone("+44 7700 900123"), "+447700900123");
  assert.equal(normalizePhone("12"), null);
  assert.equal(normalizePhone(""), null);
});

test("masks contact details", () => {
  assert.equal(maskEmail("ada.okafor@gmail.com"), "ad•••••@gmail.com");
  assert.equal(maskEmail("a@x.com"), "a••@x.com");
  assert.equal(maskPhone("+2348031234567"), "•••• 4567");
  assert.equal(maskEmail("nope"), null);
});

test("synthetic emails are recognisable and never real domains", () => {
  const e = syntheticEmailFor("B0000000-0000-4000-8000-000000000001");
  assert.ok(e.endsWith(".invalid"));
  assert.ok(isSyntheticEmail(e));
  assert.ok(!isSyntheticEmail("ada@gmail.com"));
});

test("safeNextPath blocks open redirects", () => {
  assert.equal(safeNextPath("/c/abc"), "/c/abc");
  assert.equal(safeNextPath("//evil.com"), "/");
  assert.equal(safeNextPath("/\\evil.com"), "/");
  assert.equal(safeNextPath("https://evil.com"), "/");
  assert.equal(safeNextPath("javascript:alert(1)"), "/");
  assert.equal(safeNextPath(null, "/me"), "/me");
});

test("CSV cells are escaped and formula injection is neutralised", () => {
  assert.equal(csvCell('He said "hi", then left'), '"He said ""hi"", then left"');
  assert.equal(csvCell("=HYPERLINK(\"http://x\")"), `"'=HYPERLINK(""http://x"")"`);
  assert.equal(csvCell("+2348031234567"), "'+2348031234567");
  assert.equal(csvCell(null), "");
  const csv = toCsv([{ a: 1, b: "x,y" }], [{ header: "A", value: (r) => r.a }, { header: "B", value: (r) => r.b }]);
  assert.equal(csv, '﻿A,B\r\n1,"x,y"\r\n');
});

test("slugify produces URL-safe slugs", () => {
  assert.equal(slugify("  Harvest Sunday — Épé 2026! "), "harvest-sunday-epe-2026");
  assert.equal(slugify("***"), "");
});

test("search input cannot break PostgREST filters", () => {
  assert.equal(sanitizeSearch("ada),phone.eq.(1"), "ada phone eq 1");
  assert.equal(sanitizeSearch("x".repeat(100)).length, 60);
});
