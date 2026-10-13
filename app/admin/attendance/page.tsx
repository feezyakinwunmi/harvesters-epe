import Link from "next/link";
import { ClipboardCheck, Clock, Download, MonitorPlay, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { attendanceQuery, METHOD_LABELS } from "@/lib/data/attendance";
import { getServiceOptions } from "@/lib/data/admin";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { RecordAttendanceForm } from "@/components/admin/record-attendance-form";
import { RecordAttendanceDrawer } from "@/components/admin/record-attendance-drawer";
import { AttendanceRowActions } from "@/components/admin/attendance-row-actions";
import { Badge, EmptyState, Notice, Panel, PanelHeader } from "@/components/ui/display";
import { Pagination, parsePage, Table, TD, TH, THead, TR } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime, utcIsoToLocalInput } from "@/lib/time";

const PAGE_SIZE = 30;

export default async function AttendancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await getAdminContext("attendance.view", "/admin/attendance");
  if (!ctx) return <AccessDenied />;
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  const [{ data, count, error }, services] = await Promise.all([
    attendanceQuery(supabase, sp, { count: true }).range(from, from + PAGE_SIZE - 1),
    getServiceOptions(),
  ]);
  const rows = data ?? [];
  const canManage = ctx.can("attendance.manage");
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Every check-in across services. People who didn't scan are shown as not checked in — never assumed absent."
        actions={
          <>
            {canManage ? <RecordAttendanceDrawer services={services} defaultServiceId={sp.service} /> : null}
            <Button asChild variant="secondary"><a href={`/admin/attendance/export${exportQs ? `?${exportQs}` : ""}`}><Download aria-hidden /> Export CSV</a></Button>
          </>
        }
      />
      <div className={canManage ? "grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]" : ""}>
        <Panel className="min-w-0">
          <FilterBar
            path="/admin/attendance"
            values={sp}
            fields={[
              { type: "search", name: "q", placeholder: "Search name or member number" },
              { type: "select", name: "service", label: "Service", options: services.map((s) => ({ value: s.id, label: s.label })) },
              { type: "select", name: "mode", label: "Mode", options: [{ value: "physical", label: "In person" }, { value: "online", label: "Online" }] },
              { type: "select", name: "method", label: "Method", options: Object.entries(METHOD_LABELS).map(([value, label]) => ({ value, label })) },
              { type: "select", name: "first", label: "Visit", options: [{ value: "1", label: "First visits only" }] },
              { type: "date", name: "from", label: "From" },
              { type: "date", name: "to", label: "To" },
            ]}
          />
          {error ? (
            <Notice tone="danger" className="m-4">Attendance couldn&apos;t load. Please refresh.</Notice>
          ) : rows.length === 0 ? (
            <EmptyState icon={<ClipboardCheck />} title="No check-ins match" description="Try a different service or date range." />
          ) : (
            <>
            <div className="flex items-center justify-between px-4 pt-3 text-xs font-semibold text-muted md:hidden">
              <span>{(count ?? rows.length).toLocaleString()} check-ins</span>
              <span>Page {page}</span>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {rows.map((r) => {
                const name = `${r.preferred_name || r.first_name} ${r.last_name}`;
                const online = r.mode === "online";
                return (
                  <li key={r.id} className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${online ? "bg-accent-soft text-accent" : "bg-ink text-gold-light"}`}>
                        {online ? <MonitorPlay className="size-4" aria-hidden /> : <UserRound className="size-4" aria-hidden />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Link href={`/admin/members/${r.member_id}`} className="font-semibold text-ink hover:underline">{name}</Link>
                          {r.is_first_attendance ? <Badge tone="accent">First visit</Badge> : null}
                        </div>
                        <p className="text-xs text-muted tabular-nums">{r.member_number}</p>
                        <Link href={`/admin/attendance?service=${r.service_id}`} className="mt-2 block truncate text-sm text-ink hover:underline">{r.service_title}</Link>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <span>{formatDate(r.service_starts_at)}</span>
                          <span className="inline-flex items-center gap-1 tabular-nums"><Clock className="size-3 text-accent" aria-hidden /> {formatTime(r.checked_in_at)}</span>
                          <span>{online ? "Online" : "In person"} · {METHOD_LABELS[r.method ?? ""] ?? r.method}</span>
                        </p>
                        {r.note ? <p className="mt-1.5 line-clamp-2 rounded-sm bg-canvas px-2.5 py-1.5 text-xs text-muted">{r.note}</p> : null}
                      </div>
                    </div>
                    {canManage ? (
                      <AttendanceRowActions
                        id={r.id!}
                        mode={r.mode ?? "physical"}
                        checkedInLocal={utcIsoToLocalInput(r.checked_in_at)}
                        name={name}
                        className="mt-3 justify-start gap-2 pl-12 [&_button]:border [&_button]:border-line-strong"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <div className="hidden md:block">
            <Table caption="Attendance records">
              <THead>
                <tr>
                  <TH>Name</TH>
                  <TH>Service</TH>
                  <TH>Checked in</TH>
                  <TH>Mode</TH>
                  <TH className="hidden md:table-cell">Method</TH>
                  {canManage ? <TH className="text-right">Actions</TH> : null}
                </tr>
              </THead>
              <tbody>
                {rows.map((r) => {
                  const name = `${r.preferred_name || r.first_name} ${r.last_name}`;
                  return (
                    <TR key={r.id}>
                      <TD>
                        <Link href={`/admin/members/${r.member_id}`} className="font-semibold text-ink hover:underline">{name}</Link>
                        {r.is_first_attendance ? <Badge tone="accent" className="ml-2">First visit</Badge> : null}
                        <span className="block text-xs text-muted tabular-nums">{r.member_number}</span>
                      </TD>
                      <TD>
                        <Link href={`/admin/attendance?service=${r.service_id}`} className="text-ink hover:underline">{r.service_title}</Link>
                        <span className="block text-xs text-muted">{formatDate(r.service_starts_at)}</span>
                      </TD>
                      <TD className="whitespace-nowrap tabular-nums">{formatTime(r.checked_in_at)}</TD>
                      <TD>{r.mode === "online" ? "Online" : "In person"}</TD>
                      <TD className="hidden text-muted md:table-cell" >
                        {METHOD_LABELS[r.method ?? ""] ?? r.method}
                        {r.note ? <span className="block max-w-56 truncate text-xs" title={r.note}>{r.note}</span> : null}
                      </TD>
                      {canManage ? (
                        <TD className="text-right">
                          <AttendanceRowActions id={r.id!} mode={r.mode ?? "physical"} checkedInLocal={utcIsoToLocalInput(r.checked_in_at)} name={name} />
                        </TD>
                      ) : null}
                    </TR>
                  );
                })}
              </tbody>
            </Table>
            </div>
            </>
          )}
          <Pagination path="/admin/attendance" params={sp} page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
        </Panel>

        {canManage ? (
          <Panel className="hidden h-fit 2xl:sticky 2xl:top-8 2xl:block">
            <PanelHeader title="Record attendance" description="Usher-assisted or manual. A reason is required." />
            <div className="p-5"><RecordAttendanceForm services={services} defaultServiceId={sp.service} /></div>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
