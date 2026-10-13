import { getAdminContext } from "@/lib/auth/session";
import { AccessDenied } from "@/components/admin/access-denied";
import { ContentSection } from "@/components/admin/content-section";

export const metadata = { title: "Events" };

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string; deleted?: string }> }) {
  const ctx = await getAdminContext("content.manage", "/admin/events");
  if (!ctx) return <AccessDenied />;
  return (
    <ContentSection
      section="events"
      title="Events"
      description="Programmes and gatherings shown on the Events page. Attendance for an event is tracked by creating a service for it."
      sp={await searchParams}
    />
  );
}
