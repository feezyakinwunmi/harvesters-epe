import { getAdminContext } from "@/lib/auth/session";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { ContentForm } from "@/components/admin/content-form";
import { Panel } from "@/components/ui/display";
import { CONTENT_META, isContentType } from "@/lib/validation/content";

export const metadata = { title: "New post" };

export default async function NewContentPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const ctx = await getAdminContext("content.manage", "/admin/content/new");
  if (!ctx) return <AccessDenied />;
  const { type: raw } = await searchParams;
  const type = isContentType(raw) ? raw : "news";
  const meta = CONTENT_META[type];
  return (
    <>
      <PageHeader back={{ href: `/admin/${meta.section}`, label: meta.section === "today" ? "Today & Media" : meta.section === "news" ? "News & Announcements" : "Events" }} title={meta.newLabel} />
      <Panel className="max-w-4xl p-6 sm:p-8">
        <ContentForm d={{ content_type: type, status: "draft" }} />
      </Panel>
    </>
  );
}
