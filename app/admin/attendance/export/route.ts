import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminRoles } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { attendanceQuery, METHOD_LABELS } from "@/lib/data/attendance";
import { toCsv } from "@/lib/text";
import { appTimezone, formatDate, formatTime, localDateKey } from "@/lib/time";

export async function GET(request: NextRequest) {
  const roles = await getAdminRoles();
  if (!can(roles, "attendance.view")) return new NextResponse("Forbidden", { status: 403 });

  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
  const supabase = await createClient();
  const { data, error } = await attendanceQuery(supabase, sp).limit(20000);
  if (error) return new NextResponse("Export failed", { status: 500 });

  const tz = appTimezone();
  const csv = toCsv(data ?? [], [
    { header: "Service", value: (r) => r.service_title },
    { header: "Service date", value: (r) => formatDate(r.service_starts_at, tz) },
    { header: "Member number", value: (r) => r.member_number },
    { header: "First name", value: (r) => r.preferred_name || r.first_name },
    { header: "Last name", value: (r) => r.last_name },
    { header: "Phone", value: (r) => r.phone },
    { header: "Status", value: (r) => r.membership_status },
    { header: "Department", value: (r) => r.church_department },
    { header: "Unit", value: (r) => r.ministry_unit },
    { header: "Checked in (local)", value: (r) => `${formatDate(r.checked_in_at, tz)} ${formatTime(r.checked_in_at, tz)}` },
    { header: "Checked in (UTC)", value: (r) => r.checked_in_at },
    { header: "Mode", value: (r) => (r.mode === "online" ? "Online" : "In person") },
    { header: "Method", value: (r) => METHOD_LABELS[r.method ?? ""] ?? r.method },
    { header: "First visit", value: (r) => (r.is_first_attendance ? "Yes" : "No") },
    { header: "Note", value: (r) => r.note },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${localDateKey()}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
