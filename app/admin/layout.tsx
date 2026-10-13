import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { getAdminRoles, getCurrentMember, getSessionUser } from "@/lib/auth/session";
import { navFor, ROLE_LABELS } from "@/lib/auth/permissions";
import { AccessDenied } from "@/components/admin/access-denied";
import { initials } from "@/lib/text";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Harvesters Epe" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/admin");
  const [roles, member] = await Promise.all([getAdminRoles(), getCurrentMember()]);

  if (roles.length === 0) {
    return (
      <main id="main" className="mx-auto max-w-lg px-5 py-24">
        <AccessDenied message="This area is for church staff. If you serve on the admin team, ask a super admin to give your account a role." />
      </main>
    );
  }

  const items = navFor(roles).map(({ key, href, label, group }) => ({ key, href, label, group }));
  const userLabel = member ? `${member.preferred_name || member.first_name} ${member.last_name}` : (user.email ?? "Admin");

  return (
    <div className="min-h-dvh bg-canvas">
      <AdminSidebar
        items={items}
        userLabel={userLabel}
        roleLabel={roles.map((r) => ROLE_LABELS[r]).join(", ")}
        initials={member ? initials(member.first_name, member.last_name) : userLabel.slice(0, 2).toUpperCase()}
      />
      <main id="main" className="pb-28 lg:pb-0 lg:pl-64">
        <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
