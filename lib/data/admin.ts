import "server-only";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";

export async function getStaff(roles: string[] = ["super_admin", "pastoral_admin"]) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_directory");
  return (data ?? [])
    .filter((s) => s.user_id && (s.roles ?? []).some((r) => roles.includes(r)))
    .map((s) => ({ id: s.user_id as string, name: s.display_name ?? "Staff member" }));
}

/** Recent and upcoming services for pickers (last 60 days → next 14). */
export async function getServiceOptions() {
  const supabase = await createClient();
  const from = new Date(Date.now() - 60 * 864e5).toISOString();
  const to = new Date(Date.now() + 14 * 864e5).toISOString();
  const { data } = await supabase
    .from("services")
    .select("id, title, starts_at, allow_online_attendance, status")
    .is("deleted_at", null)
    .neq("status", "cancelled")
    .gte("starts_at", from)
    .lte("starts_at", to)
    .order("starts_at", { ascending: false })
    .limit(60);
  return (data ?? []).map((s) => ({ id: s.id, label: `${s.title} — ${formatDateTime(s.starts_at)}`, allowOnline: s.allow_online_attendance }));
}
