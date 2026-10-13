import { test } from "node:test";
import assert from "node:assert/strict";
import { can, isAdminRole, navFor, permissionsFor, type AdminRole } from "../../lib/auth/permissions.ts";

test("no roles means no access", () => {
  assert.equal(can([], "dashboard.view"), false);
  assert.equal(can(null, "members.view"), false);
});

test("content admins cannot see members, attendance or follow-up", () => {
  const r: AdminRole[] = ["content_admin"];
  assert.equal(can(r, "content.manage"), true);
  for (const p of ["members.view", "members.edit_private", "attendance.view", "attendance.manage", "services.manage", "followup.manage", "roles.manage"] as const) {
    assert.equal(can(r, p), false, p);
  }
});

test("attendance admins run the usher desk but cannot see private details", () => {
  const r: AdminRole[] = ["attendance_admin"];
  for (const p of ["members.view", "members.create", "attendance.manage", "services.manage", "members.recovery_code"] as const) {
    assert.equal(can(r, p), true, p);
  }
  for (const p of ["members.edit_private", "followup.manage", "content.manage", "members.erase", "roles.manage"] as const) {
    assert.equal(can(r, p), false, p);
  }
});

test("pastoral admins handle follow-up and private details but not attendance edits or content", () => {
  const r: AdminRole[] = ["pastoral_admin"];
  assert.equal(can(r, "followup.manage"), true);
  assert.equal(can(r, "members.edit_private"), true);
  assert.equal(can(r, "attendance.manage"), false);
  assert.equal(can(r, "content.manage"), false);
  assert.equal(can(r, "members.erase"), false);
});

test("only super admins manage roles, settings, audit and permanent deletion", () => {
  for (const role of ["attendance_admin", "content_admin", "pastoral_admin"] as const) {
    for (const p of ["roles.manage", "settings.manage", "audit.view", "members.erase", "content.hard_delete", "members.revoke_sessions"] as const) {
      assert.equal(can([role], p), false, `${role} ${p}`);
    }
  }
  assert.equal(can(["super_admin"], "roles.manage"), true);
});

test("multiple roles combine", () => {
  const perms = permissionsFor(["content_admin", "attendance_admin"]);
  assert.ok(perms.includes("content.manage"));
  assert.ok(perms.includes("attendance.manage"));
  assert.ok(!perms.includes("members.edit_private"));
});

test("navigation only shows permitted sections", () => {
  assert.deepEqual(navFor(["content_admin"]).map((n) => n.key), ["overview", "today", "news", "events", "recognitions"]);
  assert.ok(navFor(["super_admin"]).some((n) => n.key === "audit"));
});

test("role guard rejects unknown strings", () => {
  assert.equal(isAdminRole("super_admin"), true);
  assert.equal(isAdminRole("owner"), false);
  assert.equal(isAdminRole(undefined), false);
});
