import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { ServiceForm } from "@/components/admin/service-forms";
import { Panel } from "@/components/ui/display";
import { utcIsoToLocalInput } from "@/lib/time";

export const metadata = { title: "Edit service" };

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAdminContext("services.manage", `/admin/services/${id}/edit`);
  if (!ctx) return <AccessDenied />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: s } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
  if (!s || s.deleted_at) notFound();
  return (
    <>
      <PageHeader
        back={{ href: `/admin/services/${id}`, label: s.title }}
        title="Edit service"
        description="Changing the service times doesn't move existing QR check-in windows; adjust or add a session on the service page."
      />
      <Panel className="max-w-3xl p-6 sm:p-8">
        <ServiceForm
          isNew={false}
          defaults={{
            id: s.id,
            title: s.title,
            description: s.description,
            service_type: s.service_type,
            starts_at_local: utcIsoToLocalInput(s.starts_at),
            ends_at_local: utcIsoToLocalInput(s.ends_at),
            location: s.location,
            status: s.status,
            allow_physical_attendance: s.allow_physical_attendance,
            allow_online_attendance: s.allow_online_attendance,
          }}
        />
      </Panel>
    </>
  );
}
