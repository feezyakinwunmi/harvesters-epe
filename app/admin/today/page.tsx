import Link from "next/link";
import { Medal } from "lucide-react";
import { getAdminContext } from "@/lib/auth/session";
import { AccessDenied } from "@/components/admin/access-denied";
import { ContentSection } from "@/components/admin/content-section";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Today & Media" };

export default async function AdminTodayPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string; deleted?: string }> }) {
  const ctx = await getAdminContext("content.manage", "/admin/today");
  if (!ctx) return <AccessDenied />;
  return (
    <ContentSection
      section="today"
      title="Today & Media"
      description="The message, photos, videos and highlights on the Today at Epe page. Use the arrows to set the order."
      sp={await searchParams}
      extraActions={<Button asChild variant="secondary" size="sm"><Link href="/admin/recognitions"><Medal aria-hidden /> Recognitions</Link></Button>}
    />
  );
}
