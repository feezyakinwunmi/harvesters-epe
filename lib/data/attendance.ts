import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import { localInputToUtcIso } from "@/lib/time";
import { sanitizeSearch } from "@/lib/text";

export type AttendanceFilters = {
  service?: string;
  mode?: string;
  method?: string;
  from?: string;
  to?: string;
  q?: string;
  first?: string;
};

/** Builds the attendance_report query used by both the table and the CSV export. */
export function attendanceQuery(supabase: ServerSupabase, f: AttendanceFilters, opts: { count?: boolean } = {}) {
  let q = supabase
    .from("attendance_report")
    .select(
      "id, member_id, member_number, first_name, last_name, preferred_name, phone, gender, membership_status, church_department, ministry_unit, service_id, service_title, service_starts_at, checked_in_at, mode, method, note, is_first_attendance",
      opts.count ? { count: "exact" } : undefined,
    );
  if (f.service && /^[0-9a-f-]{36}$/i.test(f.service)) q = q.eq("service_id", f.service);
  if (f.mode === "physical" || f.mode === "online") q = q.eq("mode", f.mode);
  if (f.method && ["qr", "online", "manual", "admin_assisted"].includes(f.method)) q = q.eq("method", f.method as "qr");
  if (f.from) q = q.gte("checked_in_at", localInputToUtcIso(`${f.from}T00:00`) ?? f.from);
  if (f.to) q = q.lte("checked_in_at", localInputToUtcIso(`${f.to}T23:59`) ?? f.to);
  if (f.first === "1") q = q.eq("is_first_attendance", true);
  for (const term of sanitizeSearch(f.q).split(" ").filter(Boolean).slice(0, 4)) {
    q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,preferred_name.ilike.%${term}%,member_number.ilike.%${term}%`);
  }
  return q.order("checked_in_at", { ascending: false });
}

export const METHOD_LABELS: Record<string, string> = { qr: "QR scan", online: "Online link", admin_assisted: "Usher-assisted", manual: "Manual" };
