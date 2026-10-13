import { getAdminContext } from "@/lib/auth/session";
import { AccessDenied } from "@/components/admin/access-denied";
import { ContentSection } from "@/components/admin/content-section";

export const metadata = { title: "News & Announcements" };

export default async function AdminNewsPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string; deleted?: string }> }) {
  const ctx = await getAdminContext("content.manage", "/admin/news");
  if (!ctx) return <AccessDenied />;
  return (
    <ContentSection
      section="news"
      title="News & Announcements"
      description="Only published posts appear on the website. Featured posts are listed first."
      sp={await searchParams}
    />
  );
}
