import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminRoles } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { sanitizeSearch, toCsv } from "@/lib/text";
import { localDateKey } from "@/lib/time";

// Member list export (contact details) — pastoral and super admins only.
// Uses the signed-in user's client, so RLS also applies.
export async function GET(request: NextRequest) {
  const roles = await getAdminRoles();
  if (!can(roles, "members.edit_private")) return new NextResponse("Forbidden", { status: 403 });

  const sp = request.nextUrl.searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("members")
    .select("member_number, first_name, last_name, preferred_name, gender, marital_status, phone, whatsapp_number, email, city, state, membership_status, is_student, school_name, occupation, church_department, ministry_unit, date_joined_church, consent_to_contact, created_at")
    .is("deleted_at", null)
    .order("last_name")
    .limit(10000);
  for (const term of sanitizeSearch(sp.get("q")).split(" ").filter(Boolean).slice(0, 4)) {
    query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,member_number.ilike.%${term}%`);
  }
  const eq = [
    ["status", "membership_status"], ["gender", "gender"], ["marital", "marital_status"], ["department", "church_department"],
    ["unit", "ministry_unit"], ["school", "school_name"], ["occupation", "occupation"],
  ] as const;
  for (const [param, column] of eq) {
    const v = sp.get(param);
    if (v) query = column === "membership_status" ? query.eq(column, v as "member") : query.eq(column, v);
  }
  if (sp.get("student") === "yes") query = query.eq("is_student", true);
  if (sp.get("student") === "no") query = query.eq("is_student", false);

  const { data, error } = await query;
  if (error) return new NextResponse("Export failed", { status: 500 });

  const csv = toCsv(data ?? [], [
    { header: "Member number", value: (r) => r.member_number },
    { header: "First name", value: (r) => r.first_name },
    { header: "Last name", value: (r) => r.last_name },
    { header: "Preferred name", value: (r) => r.preferred_name },
    { header: "Gender", value: (r) => r.gender },
    { header: "Marital status", value: (r) => r.marital_status },
    { header: "Phone", value: (r) => r.phone },
    { header: "WhatsApp", value: (r) => r.whatsapp_number },
    { header: "Email", value: (r) => (r.email?.endsWith(".invalid") ? "" : r.email) },
    { header: "Town", value: (r) => r.city },
    { header: "State", value: (r) => r.state },
    { header: "Status", value: (r) => r.membership_status },
    { header: "Student", value: (r) => (r.is_student ? "Yes" : "No") },
    { header: "School", value: (r) => r.school_name },
    { header: "Occupation", value: (r) => r.occupation },
    { header: "Department", value: (r) => r.church_department },
    { header: "Unit", value: (r) => r.ministry_unit },
    { header: "Date joined", value: (r) => r.date_joined_church },
    { header: "Consent to contact", value: (r) => (r.consent_to_contact ? "Yes" : "No") },
    { header: "Registered", value: (r) => r.created_at },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="members-${localDateKey()}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
