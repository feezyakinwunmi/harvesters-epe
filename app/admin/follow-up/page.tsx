import Link from "next/link";
import { HeartHandshake, MessageCircle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { setFollowUpStatus } from "@/lib/actions/followup";
import { getStaff } from "@/lib/data/admin";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Badge, EmptyState, Notice, Panel } from "@/components/ui/display";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/lib/time";
import { cn, toTitle } from "@/lib/utils";

const TABS = [
  { key: "suggested", label: "Might need a touch" },
  { key: "open", label: "Open follow-ups" },
  { key: "mine", label: "Assigned to me" },
] as const;

function whatsappLink(phone: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? `https://wa.me/${digits}` : null;
}

export default async function FollowUpPage({ searchParams }: { searchParams: Promise<{ tab?: string; days?: string }> }) {
  const ctx = await getAdminContext("followup.manage", "/admin/follow-up");
  if (!ctx) return <AccessDenied />;
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "suggested";
  const days = [14, 28, 56].includes(Number(sp.days)) ? Number(sp.days) : 28;
  const supabase = await createClient();
  const staff = await getStaff();
  const staffName = new Map(staff.map((s) => [s.id, s.name]));

  const candidates = tab === "suggested" ? await supabase.rpc("followup_candidates", { p_days: days, p_limit: 100 }) : null;
  const followUps =
    tab !== "suggested"
      ? await (() => {
          let q = supabase
            .from("follow_ups")
            .select("id, subject, details, status, priority, due_at, assigned_to, created_at, member_id, members(first_name, last_name, preferred_name, phone, whatsapp_number, consent_to_contact)")
            .in("status", ["open", "in_progress"])
            .order("due_at", { ascending: true, nullsFirst: false })
            .limit(200);
          if (tab === "mine") q = q.eq("assigned_to", ctx.user.id);
          return q;
        })()
      : null;

  return (
    <>
      <PageHeader
        title="Follow-up"
        description="First-time visitors and people who haven't checked in for a while. Reach out personally — nothing here sends messages automatically."
      />
      <nav aria-label="Follow-up views" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/follow-up?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold", tab === t.key ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-muted hover:text-ink")}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "suggested" ? (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 text-sm">
            <p className="text-muted">First visits in the last 14 days, and regulars not checked in for</p>
            <div className="flex gap-1">
              {[14, 28, 56].map((d) => (
                <Link key={d} href={`/admin/follow-up?tab=suggested&days=${d}`} aria-current={days === d ? "true" : undefined} className={cn("rounded-sm px-2.5 py-1 font-semibold", days === d ? "bg-ink text-white" : "text-muted hover:bg-fill")}>
                  {d / 7} weeks
                </Link>
              ))}
            </div>
          </div>
          {candidates?.error ? (
            <Notice tone="danger" className="m-4">Couldn&apos;t load suggestions.</Notice>
          ) : !candidates?.data?.length ? (
            <EmptyState icon={<HeartHandshake />} title="Everyone's been reached" description="No first-time visitors or quiet regulars waiting for a call." />
          ) : (
            <Table caption="People who might need a touch">
              <THead><tr><TH>Person</TH><TH>Why</TH><TH>Last check-in</TH><TH>Last contact</TH><TH className="text-right">Reach out</TH></tr></THead>
              <tbody>
                {candidates.data.map((c) => {
                  const wa = c.consent_to_contact ? whatsappLink(c.whatsapp_number || c.phone) : null;
                  return (
                    <TR key={c.member_id}>
                      <TD>
                        <Link href={`/admin/members/${c.member_id}`} className="font-semibold text-ink hover:underline">{c.display_name}</Link>
                        {!c.consent_to_contact ? <span className="block text-xs text-muted">Hasn&apos;t consented to contact</span> : null}
                      </TD>
                      <TD>{c.reason === "first_visit" ? <Badge tone="accent">First visit</Badge> : <Badge tone="neutral">Not checked in recently</Badge>}</TD>
                      <TD className="whitespace-nowrap text-muted">{c.last_attended_at ? formatDate(c.last_attended_at) : "—"}</TD>
                      <TD className="whitespace-nowrap text-muted">{c.last_contacted_at ? formatDate(c.last_contacted_at) : "Not yet"}</TD>
                      <TD className="text-right">
                        <div className="flex justify-end gap-1">
                          {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-sm font-semibold text-ink hover:bg-fill"><MessageCircle className="size-4" aria-hidden /> WhatsApp</a> : null}
                          {c.consent_to_contact && c.phone ? <a href={`tel:${c.phone}`} className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-sm font-semibold text-ink hover:bg-fill"><Phone className="size-4" aria-hidden /> Call</a> : null}
                          <Link href={`/admin/members/${c.member_id}#contact`} className="inline-flex h-8 items-center rounded-sm border border-line-strong px-2.5 text-sm font-semibold text-ink hover:bg-fill">Log contact</Link>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>
      ) : (
        <Panel>
          {followUps?.error ? (
            <Notice tone="danger" className="m-4">Couldn&apos;t load follow-ups.</Notice>
          ) : !followUps?.data?.length ? (
            <EmptyState icon={<HeartHandshake />} title={tab === "mine" ? "Nothing assigned to you" : "No open follow-ups"} description="Add follow-ups from a member's record." />
          ) : (
            <Table caption="Open follow-ups">
              <THead><tr><TH>Follow-up</TH><TH>Person</TH><TH>Due</TH><TH>Assigned</TH><TH className="text-right">Status</TH></tr></THead>
              <tbody>
                {followUps.data.map((f) => {
                  const m = f.members as unknown as { first_name: string; last_name: string; preferred_name: string | null } | null;
                  const overdue = f.due_at && new Date(f.due_at).getTime() < Date.now();
                  return (
                    <TR key={f.id}>
                      <TD>
                        <p className="font-semibold text-ink">{f.subject}</p>
                        {f.details ? <p className="max-w-md truncate text-xs text-muted">{f.details}</p> : null}
                        {f.priority === "high" ? <Badge tone="accent" className="mt-1">High priority</Badge> : null}
                      </TD>
                      <TD>{m ? <Link href={`/admin/members/${f.member_id}`} className="text-ink hover:underline">{m.preferred_name || m.first_name} {m.last_name}</Link> : "—"}</TD>
                      <TD className={cn("whitespace-nowrap", overdue ? "font-semibold text-accent" : "text-muted")}>{f.due_at ? formatDate(f.due_at) : "—"}</TD>
                      <TD className="text-muted">{f.assigned_to ? staffName.get(f.assigned_to) ?? "Staff" : "Unassigned"}</TD>
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Badge tone="outline">{toTitle(f.status)}</Badge>
                          <ConfirmAction action={setFollowUpStatus} hidden={{ id: f.id, status: "completed" }} title="Mark done?" confirmLabel="Mark done" trigger="Done" triggerVariant="ghost" />
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>
      )}
    </>
  );
}
