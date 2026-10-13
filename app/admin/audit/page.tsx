import { FileClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { getStaff } from "@/lib/data/admin";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { EmptyState, Panel } from "@/components/ui/display";
import { Pagination, parsePage, Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime, localInputToUtcIso } from "@/lib/time";

export const metadata = { title: "Audit log" };
const PAGE_SIZE = 50;

const ENTITIES = [
  "members", "member_private", "attendance", "services", "attendance_sessions", "admin_roles",
  "content_posts", "member_recognitions", "follow_ups", "member_contact_logs", "app_settings",
].map((v) => ({ value: v, label: v.replace(/_/g, " ") }));

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await getAdminContext("audit.view", "/admin/audit");
  if (!ctx) return <AccessDenied />;
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const supabase = await createClient();
  let q = supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (sp.entity) q = q.eq("entity_type", sp.entity);
  if (sp.actor && /^[0-9a-f-]{36}$/i.test(sp.actor)) q = q.eq("actor_user_id", sp.actor);
  if (sp.from) q = q.gte("created_at", localInputToUtcIso(`${sp.from}T00:00`) ?? sp.from);
  if (sp.to) q = q.lte("created_at", localInputToUtcIso(`${sp.to}T23:59`) ?? sp.to);
  const from = (page - 1) * PAGE_SIZE;
  const [{ data, count }, staff] = await Promise.all([q.range(from, from + PAGE_SIZE - 1), getStaff(["super_admin", "attendance_admin", "content_admin", "pastoral_admin"])]);
  const names = new Map(staff.map((s) => [s.id, s.name]));
  const rows = data ?? [];

  return (
    <>
      <PageHeader title="Audit log" description="Every administrative change, who made it and why. Entries can't be edited or deleted — not even by super admins." />
      <Panel>
        <FilterBar
          path="/admin/audit"
          values={sp}
          fields={[
            { type: "select", name: "entity", label: "Area", options: ENTITIES },
            { type: "select", name: "actor", label: "Who", options: staff.map((s) => ({ value: s.id, label: s.name })) },
            { type: "date", name: "from", label: "From" },
            { type: "date", name: "to", label: "To" },
          ]}
        />
        {rows.length === 0 ? (
          <EmptyState icon={<FileClock />} title="No entries" />
        ) : (
          <Table caption="Audit log">
            <THead><tr><TH>When</TH><TH>Who</TH><TH>What</TH><TH className="hidden lg:table-cell">Details</TH></tr></THead>
            <tbody>
              {rows.map((r) => {
                const meta = (r.metadata ?? {}) as Record<string, unknown>;
                const details = [
                  typeof meta.reason === "string" ? `Reason: ${meta.reason}` : null,
                  Array.isArray(meta.changed) ? `Changed: ${(meta.changed as string[]).join(", ")}` : null,
                ].filter(Boolean).join(" · ");
                return (
                  <TR key={r.id}>
                    <TD className="whitespace-nowrap text-muted">{formatDateTime(r.created_at)}</TD>
                    <TD className="whitespace-nowrap">{r.actor_user_id ? names.get(r.actor_user_id) ?? "Member / former staff" : "System"}</TD>
                    <TD>
                      <p className="text-ink">{r.summary ?? r.action}</p>
                      <p className="text-xs text-muted">{r.action}</p>
                    </TD>
                    <TD className="hidden max-w-md text-xs text-muted lg:table-cell">{details || "—"}</TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pagination path="/admin/audit" params={sp} page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
      </Panel>
    </>
  );
}
