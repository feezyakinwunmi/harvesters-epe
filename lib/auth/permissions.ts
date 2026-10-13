// Role → permission matrix used by server actions, pages and navigation.
// This mirrors the database: RLS and SECURITY DEFINER functions enforce the
// same rules independently, so a bug here can hide UI but never grant access.
// Pure module — unit tested in tests/unit/permissions.test.ts.

export const ADMIN_ROLES = ["super_admin", "attendance_admin", "content_admin", "pastoral_admin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super admin",
  attendance_admin: "Attendance admin",
  content_admin: "Content admin",
  pastoral_admin: "Pastoral admin",
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  super_admin: "Full access, including roles, settings, audit log and permanent deletion.",
  attendance_admin: "Services, QR sessions, attendance and member look-up at the usher desk.",
  content_admin: "Today page, media, news, announcements, events and recognitions. No member contact details.",
  pastoral_admin: "Member records including private details, follow-up and the contact log.",
};

export type Permission =
  | "dashboard.view"
  | "members.view"
  | "members.create"
  | "members.edit"
  | "members.edit_private"
  | "members.archive"
  | "members.erase"
  | "members.revoke_sessions"
  | "members.recovery_code"
  | "attendance.view"
  | "attendance.manage"
  | "services.manage"
  | "followup.manage"
  | "content.manage"
  | "content.hard_delete"
  | "roles.manage"
  | "settings.manage"
  | "audit.view";

const MATRIX: Record<AdminRole, readonly Permission[]> = {
  super_admin: [
    "dashboard.view", "members.view", "members.create", "members.edit", "members.edit_private",
    "members.archive", "members.erase", "members.revoke_sessions", "members.recovery_code",
    "attendance.view", "attendance.manage", "services.manage", "followup.manage",
    "content.manage", "content.hard_delete", "roles.manage", "settings.manage", "audit.view",
  ],
  attendance_admin: [
    "dashboard.view", "members.view", "members.create", "members.edit", "members.recovery_code",
    "attendance.view", "attendance.manage", "services.manage",
  ],
  pastoral_admin: [
    "dashboard.view", "members.view", "members.create", "members.edit", "members.edit_private",
    "members.archive", "members.recovery_code", "attendance.view", "followup.manage",
  ],
  content_admin: ["dashboard.view", "content.manage"],
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

export function can(roles: readonly AdminRole[] | null | undefined, permission: Permission): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => MATRIX[role]?.includes(permission));
}

export function permissionsFor(roles: readonly AdminRole[]): Permission[] {
  const set = new Set<Permission>();
  for (const role of roles) for (const p of MATRIX[role] ?? []) set.add(p);
  return [...set];
}

export type NavKey =
  | "overview" | "members" | "attendance" | "services" | "follow-up" | "today"
  | "news" | "events" | "recognitions" | "roles" | "settings" | "audit";

export const NAV_ITEMS: ReadonlyArray<{ key: NavKey; href: string; label: string; permission: Permission; group: "people" | "content" | "system" }> = [
  { key: "overview", href: "/admin", label: "Overview", permission: "dashboard.view", group: "people" },
  { key: "members", href: "/admin/members", label: "Members", permission: "members.view", group: "people" },
  { key: "attendance", href: "/admin/attendance", label: "Attendance", permission: "attendance.view", group: "people" },
  { key: "services", href: "/admin/services", label: "Services & QR", permission: "services.manage", group: "people" },
  { key: "follow-up", href: "/admin/follow-up", label: "Follow-up", permission: "followup.manage", group: "people" },
  { key: "today", href: "/admin/today", label: "Today & Media", permission: "content.manage", group: "content" },
  { key: "news", href: "/admin/news", label: "News & Announcements", permission: "content.manage", group: "content" },
  { key: "events", href: "/admin/events", label: "Events", permission: "content.manage", group: "content" },
  { key: "recognitions", href: "/admin/recognitions", label: "Recognitions", permission: "content.manage", group: "content" },
  { key: "roles", href: "/admin/roles", label: "Admin users & roles", permission: "roles.manage", group: "system" },
  { key: "settings", href: "/admin/settings", label: "Settings", permission: "settings.manage", group: "system" },
  { key: "audit", href: "/admin/audit", label: "Audit log", permission: "audit.view", group: "system" },
];

export function navFor(roles: readonly AdminRole[]) {
  return NAV_ITEMS.filter((item) => can(roles, item.permission));
}
