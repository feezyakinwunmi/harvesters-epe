import Link from "next/link";
import { CalendarPlus, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge, EmptyState, Notice, Panel } from "@/components/ui/display";
import { Pagination, parsePage, Table, TD, TH, THead, TR } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime, localInputToUtcIso } from "@/lib/time";
import { SERVICE_TYPES, STATUS_TONE } from "@/lib/validation/service";
import { sanitizeSearch } from "@/lib/text";

const PAGE_SIZE = 20;


export default async function ServicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await getAdminContext("services.manage", "/admin/services");
  if (!ctx) return <AccessDenied />;
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const view = sp.view === "past" ? "past" : "upcoming";
  const supabase = await createClient();
  const now = new Date().toISOString();

  let q = supabase
    .from("services")
    .select("id, title, service_type, starts_at, ends_at, status, location, allow_online_attendance, attendance_sessions(count), attendance(count)", { count: "exact" })
    .is("deleted_at", null);
  q = view === "past" ? q.lt("ends_at", now).order("starts_at", { ascending: false }) : q.gte("ends_at", now).order("starts_at", { ascending: true });
  const term = sanitizeSearch(sp.q);
  if (term) q = q.ilike("title", `%${term}%`);
  if (sp.type) q = q.eq("service_type", sp.type);
  if (sp.from) q = q.gte("starts_at", localInputToUtcIso(`${sp.from}T00:00`) ?? sp.from);
  if (sp.to) q = q.lte("starts_at", localInputToUtcIso(`${sp.to}T23:59`) ?? sp.to);
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
  const rows = (data ?? []) as unknown as Array<{
    id: string; title: string; service_type: string; starts_at: string; ends_at: string; status: string; location: string | null;
    allow_online_attendance: boolean; attendance_sessions: Array<{ count: number }>; attendance: Array<{ count: number }>;
  }>;

  return (
    <>
      <PageHeader
        title="Services & QR sessions"
        description="Every service gets its own attendance session and QR code. Print it, place it at the entrance, and attendance records itself."
        actions={<Button asChild><Link href="/admin/services/new"><CalendarPlus aria-hidden /> New service</Link></Button>}
      />
      {sp.removed ? <Notice tone="success" className="mb-6">Service removed. Its attendance records were kept.</Notice> : null}
      <Panel>
        <div className="flex items-center gap-1 overflow-x-auto border-b border-line px-3 py-2 text-sm">
          <Link href="/admin/services" aria-current={view === "upcoming" ? "page" : undefined} className={view === "upcoming" ? "rounded-full bg-ink px-3.5 py-1.5 font-semibold text-white" : "rounded-full px-3.5 py-1.5 font-semibold text-muted transition-colors hover:bg-fill hover:text-ink"}>Upcoming & current</Link>
          <Link href="/admin/services?view=past" aria-current={view === "past" ? "page" : undefined} className={view === "past" ? "rounded-full bg-ink px-3.5 py-1.5 font-semibold text-white" : "rounded-full px-3.5 py-1.5 font-semibold text-muted transition-colors hover:bg-fill hover:text-ink"}>Past</Link>
        </div>
        <FilterBar
          path="/admin/services"
          keep={["view"]}
          values={sp}
          fields={[
            { type: "search", name: "q", placeholder: "Search service title" },
            { type: "select", name: "type", label: "Type", options: SERVICE_TYPES },
            { type: "date", name: "from", label: "From" },
            { type: "date", name: "to", label: "To" },
          ]}
        />
        {error ? (
          <Notice tone="danger" className="m-4">Services couldn&apos;t load. Please refresh.</Notice>
        ) : rows.length === 0 ? (
          <EmptyState icon={<QrCode />} title={view === "past" ? "No past services" : "No upcoming services"} description="Create a service to generate its printable QR code." action={<Button asChild size="sm"><Link href="/admin/services/new">New service</Link></Button>} />
        ) : (
          <Table caption="Services">
            <THead>
              <tr>
                <TH>Service</TH>
                <TH>When</TH>
                <TH>Status</TH>
                <TH className="text-right">QR sessions</TH>
                <TH className="text-right">Checked in</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((s) => (
                <TR key={s.id}>
                  <TD>
                    <Link href={`/admin/services/${s.id}`} className="font-semibold text-ink hover:underline">{s.title}</Link>
                    <p className="text-xs text-muted">{SERVICE_TYPES.find((t) => t.value === s.service_type)?.label ?? s.service_type}{s.allow_online_attendance ? " · online enabled" : ""}</p>
                  </TD>
                  <TD className="whitespace-nowrap">{formatDate(s.starts_at)}<span className="block text-xs text-muted">{formatTime(s.starts_at)}–{formatTime(s.ends_at)}</span></TD>
                  <TD><Badge tone={STATUS_TONE[s.status] ?? "neutral"}>{s.status.charAt(0).toUpperCase() + s.status.slice(1)}</Badge></TD>
                  <TD className="text-right tabular-nums">{s.attendance_sessions[0]?.count ?? 0 ? s.attendance_sessions[0]?.count : <Badge tone="warning">None</Badge>}</TD>
                  <TD className="text-right font-semibold tabular-nums text-ink">{s.attendance[0]?.count ?? 0}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination path="/admin/services" params={sp} page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
      </Panel>
    </>
  );
}
