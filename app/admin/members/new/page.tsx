import { getAdminContext } from "@/lib/auth/session";
import { saveMemberAdmin } from "@/lib/actions/members-admin";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { MemberProfileForm } from "@/components/forms/member-profile-form";
import { Panel } from "@/components/ui/display";

export const metadata = { title: "Add member" };

export default async function NewMemberPage() {
  const ctx = await getAdminContext("members.create", "/admin/members/new");
  if (!ctx) return <AccessDenied />;
  return (
    <>
      <PageHeader
        back={{ href: "/admin/members", label: "Members" }}
        title="Register someone"
        description="For people without a phone, or who'd rather an usher filled it in. Ask before ticking the consent boxes. They can claim the record later with an in-person sign-in code."
      />
      <Panel className="p-6 sm:p-8">
        <MemberProfileForm
          action={saveMemberAdmin}
          showPrivate={ctx.can("members.edit_private")}
          showAdmin={ctx.can("members.edit_private")}
          hidden={{ member_id: "" }}
          submitLabel="Register member"
        />
      </Panel>
    </>
  );
}
