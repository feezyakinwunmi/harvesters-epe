import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { saveMemberAdmin } from "@/lib/actions/members-admin";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { MemberProfileForm } from "@/components/forms/member-profile-form";
import { Panel } from "@/components/ui/display";

export const metadata = { title: "Edit member" };

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAdminContext("members.edit", `/admin/members/${id}/edit`);
  if (!ctx) return <AccessDenied />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const canPrivate = ctx.can("members.edit_private");
  const [{ data: member }, { data: priv }] = await Promise.all([
    supabase.from("members").select("*").eq("id", id).maybeSingle(),
    canPrivate ? supabase.from("member_private").select("*").eq("member_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!member) notFound();

  return (
    <>
      <PageHeader
        back={{ href: `/admin/members/${id}`, label: `${member.first_name} ${member.last_name}` }}
        title="Edit member"
        description={canPrivate ? undefined : "Address, date of birth, emergency contact and membership status can only be changed by pastoral or super admins."}
      />
      <Panel className="p-6 sm:p-8">
        <MemberProfileForm action={saveMemberAdmin} member={member} privateDetails={priv} showPrivate={canPrivate} showAdmin={canPrivate} hidden={{ member_id: id }} />
      </Panel>
    </>
  );
}
