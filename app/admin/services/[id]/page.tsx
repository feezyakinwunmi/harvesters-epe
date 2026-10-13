import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, MonitorPlay, Pencil, Printer, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { addOnlineLink, archiveService, cancelService, closeSessionNow, setSessionEnabled } from "@/lib/actions/services-admin";
import { checkInUrl, qrSvg } from "@/lib/qr/session-qr";
import { getServiceOptions } from "@/lib/data/admin";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { CopyLink, SessionForm } from "@/components/admin/service-forms";
import { RecordAttendanceForm } from "@/components/admin/record-attendance-form";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Badge, EmptyState, Notice, Panel, PanelHeader } from "@/components/ui/display";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { addMinutesIso, formatDateTime, formatLongDate, formatTime, utcIsoToLocalInput } from "@/lib/time";
import { STATUS_TONE } from "@/lib/validation/service";
import { getSettings } from "@/lib/settings";

function sessionState(s: { is_enabled: boolean; starts_at: string; ends_at: string }, now: number) {
  if (!s.is_enabled) return { label: "Paused", tone: "warning" as const };
  if (now < new Date(s.starts_at).getTime()) return { label: `Opens ${formatTime(s.starts_at)}`, tone: "neutral" as const };
  if (now > new Date(s.ends_at).getTime()) return { label: "Closed", tone: "outline" as const };
  return { label: "Open now", tone: "success" as const };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAdminContext("services.manage", `/admin/services/${id}`);
  if (!ctx) return <AccessDenied />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: service }, { data: sessions }, { data: attendees }, services, settings] = await Promise.all([
    supabase.from("services").select("*").eq("id", id).maybeSingle(),
    supabase.from("attendance_sessions").select("*").eq("service_id", id).order("created_at"),
    supabase
      .from("attendance_report")
      .select("id, member_id, first_name, last_name, preferred_name, member_number, checked_in_at, mode, method, is_first_attendance")
      .eq("service_id", id)
      .order("checked_in_at", { ascending: false })
      .limit(500),
    getServiceOptions(),
    getSettings(),
  ]);
  if (!service || service.deleted_at) notFound();

  const now = Date.now();
  const rows = attendees ?? [];
  const physical = rows.filter((r) => r.mode === "physical").length;
  const online = rows.length - physical;
  const firstTimers = rows.filter((r) => r.is_first_attendance).length;

  const sessionCards = await Promise.all(
    (sessions ?? []).map(async (s) => {
      try {
        const physicalUrl = checkInUrl(s.id, "physical", s.qr_token_nonce, s.qr_token_hash);
        const onlineUrl = s.online_token_nonce ? checkInUrl(s.id, "online", s.online_token_nonce, s.online_token_hash) : null;
        return { s, physicalUrl, onlineUrl, svg: await qrSvg(physicalUrl, 220), error: null as string | null };
      } catch (e) {
        return { s, physicalUrl: null, onlineUrl: null, svg: null, error: e instanceof Error ? e.message : "QR unavailable" };
      }
    }),
  );

  return (
    <>
      <PageHeader
        back={{ href: "/admin/services", label: "Services" }}
        title={service.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {formatLongDate(service.starts_at)}, {formatTime(service.starts_at)}–{formatTime(service.ends_at)}
            {service.location ? ` · ${service.location}` : ""}
            <Badge tone={STATUS_TONE[service.status] ?? "neutral"}>{service.status.charAt(0).toUpperCase() + service.status.slice(1)}</Badge>
          </span>
        }
        actions={
          <>
            <Button asChild variant="secondary" size="sm"><Link href={`/admin/services/${id}/edit`}><Pencil aria-hidden /> Edit</Link></Button>
            {service.status !== "cancelled" ? (
              <ConfirmAction action={cancelService} hidden={{ service_id: id }} title="Cancel this service?" description="Check-in stops for all its QR codes. Existing attendance is kept." confirmLabel="Cancel service" trigger="Cancel service" destructive />
            ) : null}
            <ConfirmAction
              action={archiveService}
              hidden={{ service_id: id }}
              title="Remove this service?"
              description="It disappears from lists and its QR codes stop working. Attendance records are kept for reports."
              confirmLabel="Remove service"
              trigger="Remove"
              triggerVariant="ghost"
              destructive
              requireTyped="DELETE"
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard emphasis label="Checked in" value={rows.length} />
        <StatCard label="In person" value={physical} />
        <StatCard label="Online" value={online} detail={service.allow_online_attendance ? undefined : "Online check-in is off"} />
        <StatCard label="First-time visitors" value={firstTimers} />
      </div>

      <section aria-labelledby="sessions" className="mt-8">
        <h2 id="sessions" className="mb-4 text-h3 font-bold text-ink">QR sessions</h2>
        {sessionCards.length === 0 ? (
          <Notice tone="warning" title="No QR code yet">Create a session below to generate this service&apos;s QR code.</Notice>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {sessionCards.map(({ s, physicalUrl, onlineUrl, svg, error }) => {
              const state = sessionState(s, now);
              const open = state.label === "Open now";
              return (
                <Panel key={s.id} as="article">
                  <div className="flex flex-col gap-5 p-5 sm:flex-row">
                    <div className="shrink-0 self-center sm:self-start">
                      {svg ? (
                        <div className="size-[164px] overflow-hidden rounded-sm border border-line bg-white [&_svg]:size-full" role="img" aria-label={`QR code for ${s.label}`} dangerouslySetInnerHTML={{ __html: svg }} />
                      ) : (
                        <div className="flex size-[164px] items-center justify-center rounded-sm border border-dashed border-line-strong p-3 text-center text-xs text-muted">QR unavailable</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-ink">{s.label}</h3>
                        <Badge tone={state.tone}>{state.label}</Badge>
                      </div>
                      <p className="text-sm text-muted">Check-in window: {formatDateTime(s.starts_at)} – {formatTime(s.ends_at)}</p>
                      {error ? <Notice tone="danger">{error}</Notice> : null}
                      {physicalUrl ? (
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm"><Link href={`/print/qr/${s.id}`} target="_blank"><Printer aria-hidden /> Print A4</Link></Button>
                          <Button asChild size="sm" variant="secondary"><a href={`/api/qr/${s.id}?format=png`} download><Download aria-hidden /> PNG</a></Button>
                          <Button asChild size="sm" variant="secondary"><a href={`/api/qr/${s.id}?format=svg`} download><Download aria-hidden /> SVG</a></Button>
                        </div>
                      ) : null}
                      {service.allow_online_attendance ? (
                        <div className="rounded-sm bg-canvas p-3">
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted"><MonitorPlay className="size-3.5" aria-hidden /> Online check-in link</p>
                          {onlineUrl ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <code className="max-w-full truncate rounded-sm bg-surface px-2 py-1 text-xs text-ink">{onlineUrl}</code>
                              <CopyLink url={onlineUrl} />
                            </div>
                          ) : (
                            <div className="mt-2">
                              <ConfirmAction action={addOnlineLink} hidden={{ session_id: s.id }} title="Create an online link?" description="Share it in the livestream chat during the service. It records attendance as online." confirmLabel="Create link" trigger="Create online link" />
                            </div>
                          )}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                        <ConfirmAction
                          action={setSessionEnabled}
                          hidden={{ session_id: s.id, enabled: s.is_enabled ? "false" : "true" }}
                          title={s.is_enabled ? "Pause check-in?" : "Resume check-in?"}
                          description={s.is_enabled ? "Scans will show 'check-in closed' until you resume." : "Scans will work again within the check-in window."}
                          confirmLabel={s.is_enabled ? "Pause" : "Resume"}
                          trigger={s.is_enabled ? "Pause" : "Resume"}
                          triggerVariant="ghost"
                        />
                        {open ? (
                          <ConfirmAction action={closeSessionNow} hidden={{ session_id: s.id }} title="Close check-in now?" description="The window ends immediately. Attendance already recorded is kept; ushers can still add people manually." confirmLabel="Close now" trigger="Close now" triggerVariant="ghost" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}

        <Panel className="mt-4">
          <PanelHeader title="Add a QR session" description="For a second entrance, children's church or a separate check-in window. Each gets its own code." />
          <div className="max-w-2xl p-5">
            <SessionForm
              serviceId={id}
              defaultStart={utcIsoToLocalInput(addMinutesIso(service.starts_at, -settings.checkIn.opens_minutes_before))}
              defaultEnd={utcIsoToLocalInput(addMinutesIso(service.ends_at, settings.checkIn.closes_minutes_after))}
            />
          </div>
        </Panel>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel>
          <PanelHeader
            title="Attendees"
            description={rows.length === 500 ? "Showing the latest 500 — export for the full list." : undefined}
            action={<Button asChild variant="secondary" size="sm"><a href={`/admin/attendance/export?service=${id}`}><Download aria-hidden /> Export CSV</a></Button>}
          />
          {rows.length === 0 ? (
            <EmptyState icon={<Users />} title="No one checked in yet" description="Check-ins appear here as people scan." />
          ) : (
            <Table caption="Attendees">
              <THead>
                <tr><TH>Name</TH><TH>Time</TH><TH>Mode</TH><TH>How</TH></tr>
              </THead>
              <tbody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <Link href={`/admin/members/${r.member_id}`} className="font-semibold text-ink hover:underline">{r.preferred_name || r.first_name} {r.last_name}</Link>
                      {r.is_first_attendance ? <Badge tone="accent" className="ml-2">First visit</Badge> : null}
                    </TD>
                    <TD className="tabular-nums">{formatTime(r.checked_in_at)}</TD>
                    <TD>{r.mode === "online" ? "Online" : "In person"}</TD>
                    <TD className="text-muted">{r.method === "qr" ? "QR" : r.method === "online" ? "Link" : r.method === "admin_assisted" ? "Usher" : "Manual"}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        <Panel>
          <PanelHeader title="Usher-assisted check-in" description="For people without a phone, or whose phone isn't working." />
          <div className="p-5">
            <RecordAttendanceForm services={services} defaultServiceId={id} />
          </div>
        </Panel>
      </div>
    </>
  );
}
