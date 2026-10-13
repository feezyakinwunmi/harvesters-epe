import { getAdminContext } from "@/lib/auth/session";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { ServiceForm } from "@/components/admin/service-forms";
import { Panel } from "@/components/ui/display";
import { appTimezone, localDateKey } from "@/lib/time";

export const metadata = { title: "New service" };

function nextSunday(): string {
  const tz = appTimezone();
  const today = new Date(`${localDateKey(new Date(), tz)}T00:00:00Z`);
  const add = (7 - today.getUTCDay()) % 7 || 7;
  today.setUTCDate(today.getUTCDate() + add);
  return today.toISOString().slice(0, 10);
}

export default async function NewServicePage() {
  const ctx = await getAdminContext("services.manage", "/admin/services/new");
  if (!ctx) return <AccessDenied />;
  const sunday = nextSunday();
  return (
    <>
      <PageHeader back={{ href: "/admin/services", label: "Services" }} title="New service" description="Create the service, then print its QR code." />
      <Panel className="max-w-3xl p-6 sm:p-8">
        <ServiceForm
          isNew
          defaults={{
            title: "Sunday Service",
            service_type: "sunday_service",
            starts_at_local: `${sunday}T08:00`,
            ends_at_local: `${sunday}T10:30`,
            location: "Harvesters Epe Campus",
            status: "scheduled",
            allow_physical_attendance: true,
            allow_online_attendance: false,
          }}
        />
      </Panel>
    </>
  );
}
