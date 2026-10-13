import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { revokeRole } from "@/lib/actions/system-admin";
import { ROLE_LABELS, isAdminRole } from "@/lib/auth/permissions";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { GrantRoleForm } from "@/components/admin/system-forms";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Badge, EmptyState, Panel, PanelHeader } from "@/components/ui/display";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/lib/time";

export const metadata = { title: "Admin users & roles" };

export default async function RolesPage() {
  const ctx = await getAdminContext("roles.manage", "/admin/roles");
  if (!ctx) return <AccessDenied />;
  const supabase = await createClient();
  const { data } = await supabase.from("admin_role_assignments").select("*").order("created_at");
  const rows = data ?? [];
  const superCount = rows.filter((r) => r.role === "super_admin").length;

  return (
    <>
      <PageHeader title="Admin users & roles" description="Give each person the smallest role that lets them serve. Only super admins can change roles, and every change is audited." />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel>
          {rows.length === 0 ? (
            <EmptyState icon={<ShieldCheck />} title="No roles yet" />
          ) : (
            <Table caption="Role assignments">
              <THead><tr><TH>Person</TH><TH>Role</TH><TH>Since</TH><TH className="text-right">Actions</TH></tr></THead>
              <tbody>
                {rows.map((r) => {
                  const name = r.first_name ? `${r.first_name} ${r.last_name}` : "Account without a member profile";
                  const lastSuper = r.role === "super_admin" && superCount <= 1;
                  return (
                    <TR key={r.id}>
                      <TD>
                        {r.member_id ? <Link href={`/admin/members/${r.member_id}`} className="font-semibold text-ink hover:underline">{name}</Link> : <span className="text-muted">{name}</span>}
                        {r.user_id === ctx.user.id ? <Badge tone="outline" className="ml-2">You</Badge> : null}
                      </TD>
                      <TD><Badge tone={r.role === "super_admin" ? "accent" : "neutral"}>{isAdminRole(r.role) ? ROLE_LABELS[r.role] : r.role}</Badge></TD>
                      <TD className="text-muted">{formatDate(r.created_at)}</TD>
                      <TD className="text-right">
                        {lastSuper ? (
                          <span className="text-xs text-muted">Last super admin</span>
                        ) : (
                          <ConfirmAction
                            action={revokeRole}
                            hidden={{ id: r.id! }}
                            title={`Remove ${isAdminRole(r.role) ? ROLE_LABELS[r.role] : "this role"} from ${name}?`}
                            description={r.user_id === ctx.user.id ? "This is your own role. You may lose access to this page immediately." : "They lose access to the matching admin sections immediately."}
                            confirmLabel="Remove role"
                            trigger="Remove"
                            triggerVariant="ghost"
                            destructive
                          />
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>
        <Panel className="h-fit">
          <PanelHeader title="Grant a role" description="The person must have registered (so they have a sign-in account)." />
          <div className="p-5"><GrantRoleForm /></div>
        </Panel>
      </div>
    </>
  );
}
