import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, HeartHandshake, MessageCircle, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { archiveMember, eraseMember, revokeMemberSessions } from "@/lib/actions/members-admin";
import { setFollowUpStatus } from "@/lib/actions/followup";
import { getServiceOptions, getStaff } from "@/lib/data/admin";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { RecoveryCodeButton } from "@/components/admin/member-actions";
import { ContactLogForm, FollowUpForm } from "@/components/admin/pastoral-forms";
import { CHANNELS } from "@/lib/validation/followup";
import { RecordAttendanceForm } from "@/components/admin/record-attendance-form";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Avatar, Badge, DefinitionList, EmptyState, Notice, Panel, PanelHeader } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { MEMBERSHIP_STATUSES, GENDERS, MARITAL_STATUSES } from "@/lib/validation/member";
import { formatCalendarDate, formatDate, formatDateTime, formatTime } from "@/lib/time";
import { initials, isSyntheticEmail } from "@/lib/text";
import { toTitle } from "@/lib/utils";

export default async function MemberDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await getAdminContext("members.view", `/admin/members/${id}`);
  if (!ctx) return <AccessDenied />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const pastoral = ctx.can("followup.manage");
  const [{ data: m }, history, attendanceCount, priv, followUps, contacts, staff, services] = await Promise.all([
    supabase.from("members").select("*").eq("id", id).maybeSingle(),
    supabase.from("attendance_report").select("id, service_title, service_starts_at, checked_in_at, mode, method, note").eq("member_id", id).order("checked_in_at", { ascending: false }).limit(25),
    supabase.from("attendance").select("id", { count: "exact", head: true }).eq("member_id", id),
    ctx.can("members.edit_private") ? supabase.from("member_private").select("*").eq("member_id", id).maybeSingle() : Promise.resolve({ data: null }),
    pastoral ? supabase.from("follow_ups").select("*").eq("member_id", id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
    pastoral ? supabase.from("member_contact_logs").select("*").eq("member_id", id).order("contacted_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
    pastoral ? getStaff() : Promise.resolve([]),
    ctx.can("attendance.manage") ? getServiceOptions() : Promise.resolve([]),
  ]);
  if (!m) notFound();

  const avatarUrl = m.profile_photo_path ? (await supabase.storage.from("member-avatars").createSignedUrl(m.profile_photo_path, 600)).data?.signedUrl ?? null : null;
  const name = `${m.preferred_name || m.first_name} ${m.last_name}`;
  const staffName = new Map(staff.map((s) => [s.id, s.name]));
  const fuRows = followUps.data ?? [];
  const openFollowUps = fuRows.filter((f) => f.status === "open" || f.status === "in_progress");
  const rows = history.data ?? [];
  const label = <T extends { value: string; label: string }>(list: readonly T[], v: string | null) => list.find((x) => x.value === v)?.label ?? (v ? toTitle(v) : null);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/members", label: "Members" }}
        title={
          <span className="flex items-center gap-3 sm:gap-4">
            <Avatar src={avatarUrl} initials={initials(m.first_name, m.last_name)} size={52} />
            <span className="min-w-0 break-words">
              {name}
              <span className="mt-1 flex flex-wrap items-center gap-2 text-sm font-normal tracking-normal text-muted">
                <span className="tabular-nums">{m.member_number}</span>
                <Badge tone={m.membership_status === "member" ? "accent" : "neutral"}>{label(MEMBERSHIP_STATUSES, m.membership_status)}</Badge>
                {m.deleted_at ? <Badge tone="danger">Archived</Badge> : null}
                {m.registration_assisted ? <Badge tone="outline">Usher-registered</Badge> : null}
                {!m.auth_user_id ? <Badge tone="outline">No sign-in account yet</Badge> : null}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            {ctx.can("members.recovery_code") && !m.deleted_at ? <RecoveryCodeButton memberId={m.id} memberName={m.first_name} /> : null}
            {ctx.can("members.edit") && !m.deleted_at ? (
              <Button asChild variant="secondary" size="sm"><Link href={`/admin/members/${m.id}/edit`}><Pencil aria-hidden /> Edit</Link></Button>
            ) : null}
          </>
        }
      />

      {sp.created ? <Notice tone="success" className="mb-6">Member registered. Use &ldquo;Sign-in code&rdquo; if they&apos;d like to use their own phone later.</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Profile" />
            <div className="space-y-6 p-5">
              <DefinitionList
                items={[
                  { label: "Phone", value: m.phone },
                  { label: "WhatsApp", value: m.whatsapp_number },
                  { label: "Email", value: isSyntheticEmail(m.email) ? null : m.email },
                  { label: "Town / state", value: [m.city, m.state].filter(Boolean).join(", ") },
                  { label: "Gender", value: label(GENDERS, m.gender) },
                  { label: "Marital status", value: label(MARITAL_STATUSES, m.marital_status) },
                  { label: "Student", value: m.is_student ? [m.school_name, m.course_or_department, m.education_level].filter(Boolean).join(" · ") || "Yes" : "No" },
                  { label: "Graduation year", value: m.graduation_year },
                  { label: "Occupation", value: [m.occupation, m.company_or_business].filter(Boolean).join(" at ") },
                  { label: "Date joined", value: m.date_joined_church ? formatCalendarDate(m.date_joined_church) : null },
                  { label: "Department / unit", value: [m.church_department, m.ministry_unit].filter(Boolean).join(" / ") },
                  { label: "Usual service", value: m.usual_service },
                  { label: "Previous church", value: m.previous_church },
                  { label: "Baptised", value: m.is_baptized === null ? null : m.is_baptized ? "Yes" : "Not yet" },
                  { label: "Interested in serving", value: m.interested_in_serving ? "Yes" : m.interested_in_serving === false ? "No" : null },
                  { label: "Heard about us", value: m.heard_about_church },
                  { label: "Consent to contact", value: m.consent_to_contact ? "Yes" : "No" },
                  { label: "Photos & recognition", value: m.photo_consent ? "Yes" : "No" },
                  { label: "Registered", value: formatDateTime(m.created_at) },
                ]}
              />
              {priv.data ? (
                <div className="rounded-sm border border-line bg-canvas p-4">
                  <p className="mb-3 text-xs font-semibold text-muted">Private details — pastoral and super admins only</p>
                  <DefinitionList
                    items={[
                      { label: "Address", value: priv.data.residential_address },
                      { label: "Date of birth", value: priv.data.date_of_birth ? formatCalendarDate(priv.data.date_of_birth) : null },
                      { label: "Emergency contact", value: priv.data.emergency_contact_name },
                      { label: "Emergency phone", value: priv.data.emergency_contact_phone },
                    ]}
                  />
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Attendance" description={`${attendanceCount.count ?? 0} services attended in total`} />
            {rows.length === 0 ? (
              <EmptyState icon={<CalendarCheck />} title="No attendance yet" />
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{r.service_title}</p>
                      <p className="text-muted">{formatDate(r.service_starts_at)}{r.note ? ` · ${r.note}` : ""}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular-nums text-ink">{formatTime(r.checked_in_at)}</p>
                      <p className="text-xs text-muted">{r.mode === "online" ? "Online" : "In person"} · {r.method === "qr" ? "QR" : r.method === "online" ? "Link" : r.method === "admin_assisted" ? "Usher" : "Manual"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          {ctx.can("attendance.manage") && !m.deleted_at ? (
            <Panel>
              <PanelHeader title="Record attendance" description="For usher-assisted check-in or corrections." />
              <div className="p-5">
                <RecordAttendanceForm services={services} member={{ id: m.id, name, memberNumber: m.member_number, photoConsent: m.photo_consent, hasAccount: !!m.auth_user_id, phoneLast4: null }} />
              </div>
            </Panel>
          ) : null}

          {pastoral ? (
            <>
              <Panel>
                <PanelHeader title="Follow-up" />
                {fuRows.length > 0 ? (
                  <ul className="divide-y divide-line border-b border-line">
                    {fuRows.map((f) => (
                      <li key={f.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{f.subject}</p>
                          <p className="text-muted">
                            {f.due_at ? `Due ${formatDate(f.due_at)}` : "No due date"}
                            {f.assigned_to ? ` · ${staffName.get(f.assigned_to) ?? "Assigned"}` : ""}
                          </p>
                          {f.details ? <p className="mt-1 text-muted">{f.details}</p> : null}
                        </div>
                        {f.status === "open" || f.status === "in_progress" ? (
                          <ConfirmAction
                            action={setFollowUpStatus}
                            hidden={{ id: f.id, status: "completed" }}
                            title="Mark this follow-up done?"
                            confirmLabel="Mark done"
                            trigger="Done"
                            triggerVariant="ghost"
                          />
                        ) : (
                          <Badge tone={f.status === "completed" ? "success" : "outline"}>{toTitle(f.status)}</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="p-5">
                  <FollowUpForm memberId={m.id} staff={staff} />
                </div>
              </Panel>

              <div id="contact" className="scroll-mt-6">
              <Panel>
                <PanelHeader title="Contact log" description={m.consent_to_contact ? undefined : "This person hasn't consented to be contacted. Only log contact they started."} />
                {(contacts.data ?? []).length > 0 ? (
                  <ul className="divide-y divide-line border-b border-line">
                    {(contacts.data ?? []).map((c) => (
                      <li key={c.id} className="px-5 py-3 text-sm">
                        <p className="flex items-center gap-2 text-xs text-muted">
                          <MessageCircle className="size-3.5" aria-hidden />
                          {CHANNELS.find((x) => x.value === c.channel)?.label} · {formatDateTime(c.contacted_at)}
                          {c.contacted_by ? ` · ${staffName.get(c.contacted_by) ?? "Staff"}` : ""}
                        </p>
                        <p className="mt-1 text-ink">{c.message_summary}</p>
                        {c.outcome ? <p className="text-muted">Outcome: {c.outcome}</p> : null}
                        {c.next_step ? <p className="text-muted">Next: {c.next_step}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="p-5">
                  <ContactLogForm memberId={m.id} openFollowUps={openFollowUps.map((f) => ({ id: f.id, subject: f.subject }))} />
                </div>
              </Panel>
              </div>
            </>
          ) : (
            <Panel className="p-5 text-sm text-muted">
              <HeartHandshake className="mb-2 size-4" aria-hidden />
              Follow-up and contact history are visible to pastoral staff.
            </Panel>
          )}

          {ctx.can("members.archive") || ctx.can("members.revoke_sessions") || ctx.can("members.erase") ? (
            <Panel>
              <PanelHeader title="Record management" />
              <div className="flex flex-wrap gap-2 p-5">
                {ctx.can("members.archive") ? (
                  m.deleted_at ? (
                    <ConfirmAction action={archiveMember} hidden={{ member_id: m.id, archive: "false" }} title="Restore this member?" description="They'll appear in member lists and can check in again." confirmLabel="Restore" trigger="Restore member" />
                  ) : (
                    <ConfirmAction
                      action={archiveMember}
                      hidden={{ member_id: m.id, archive: "true" }}
                      title={`Archive ${name}?`}
                      description="Archived members are hidden from lists and can't check in. Their attendance history is kept, and you can restore them at any time."
                      confirmLabel="Archive"
                      trigger="Archive"
                      destructive
                    />
                  )
                ) : null}
                {ctx.can("members.revoke_sessions") && m.auth_user_id ? (
                  <ConfirmAction
                    action={revokeMemberSessions}
                    hidden={{ member_id: m.id }}
                    title="Sign out of all devices?"
                    description="Use this if a phone was lost or shared. They'll confirm their identity with a code next time they scan."
                    confirmLabel="Sign out everywhere"
                    trigger="Sign out devices"
                  />
                ) : null}
                {ctx.can("members.erase") ? (
                  <ConfirmAction
                    action={eraseMember}
                    hidden={{ member_id: m.id }}
                    title={`Permanently erase ${name}?`}
                    description="All personal details, private notes, the profile photo and the sign-in account are deleted. Anonymous attendance totals are kept. This cannot be undone."
                    confirmLabel="Erase permanently"
                    trigger="Erase permanently"
                    triggerVariant="danger"
                    destructive
                    requireTyped="DELETE"
                  />
                ) : null}
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
