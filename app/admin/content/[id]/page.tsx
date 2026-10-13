import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { deleteContent, purgeContent, setContentStatus } from "@/lib/actions/content-admin";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { ContentForm } from "@/components/admin/content-form";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Badge, Notice, Panel } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { CONTENT_META, isContentType } from "@/lib/validation/content";
import { formatDateTime, utcIsoToLocalInput } from "@/lib/time";

export const metadata = { title: "Edit post" };

export default async function EditContentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await getAdminContext("content.manage", `/admin/content/${id}`);
  if (!ctx) return <AccessDenied />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: p } = await supabase.from("content_posts").select("*").eq("id", id).maybeSingle();
  if (!p || p.deleted_at || !isContentType(p.content_type)) notFound();
  const meta = CONTENT_META[p.content_type];
  const publicHref = p.content_type === "event" ? `/events/${p.slug ?? p.id}` : p.content_type === "news" || p.content_type === "announcement" ? `/news/${p.slug ?? p.id}` : "/today";

  return (
    <>
      <PageHeader
        back={{ href: `/admin/${meta.section}`, label: meta.section === "today" ? "Today & Media" : meta.section === "news" ? "News & Announcements" : "Events" }}
        title={p.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {meta.label}
            <Badge tone={p.status === "published" ? "success" : p.status === "draft" ? "outline" : "neutral"}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</Badge>
            {p.published_at ? <span className="text-sm">Published {formatDateTime(p.published_at)}</span> : null}
          </span>
        }
        actions={
          <>
            <Button asChild variant="secondary" size="sm"><Link href={`/admin/content/${id}/preview`}><Eye aria-hidden /> Preview</Link></Button>
            {p.status === "published" ? (
              <>
                <Button asChild variant="ghost" size="sm"><Link href={publicHref} target="_blank">View live</Link></Button>
                <ConfirmAction action={setContentStatus} hidden={{ id, status: "draft" }} title="Unpublish?" confirmLabel="Unpublish" trigger="Unpublish" />
              </>
            ) : null}
            {p.status !== "archived" ? (
              <ConfirmAction action={setContentStatus} hidden={{ id, status: "archived" }} title="Archive this post?" description="It's removed from the website but kept here under Archived." confirmLabel="Archive" trigger="Archive" triggerVariant="ghost" />
            ) : (
              <ConfirmAction action={setContentStatus} hidden={{ id, status: "draft" }} title="Restore to drafts?" confirmLabel="Restore" trigger="Restore" triggerVariant="ghost" />
            )}
            <ConfirmAction action={deleteContent} hidden={{ id }} title="Delete this post?" description="It's removed from the website and admin lists. A super admin can still recover it from the database." confirmLabel="Delete" trigger="Delete" triggerVariant="ghost" destructive />
            {ctx.can("content.hard_delete") ? (
              <ConfirmAction
                action={purgeContent}
                hidden={{ id }}
                title="Permanently delete?"
                description="The post and all its uploaded files are deleted for good. This cannot be undone."
                confirmLabel="Delete permanently"
                trigger="Delete permanently"
                triggerVariant="danger"
                destructive
                requireTyped="DELETE"
              />
            ) : null}
          </>
        }
      />
      {sp.saved ? <Notice tone="success" className="mb-6">Saved. Preview it, then publish when it&apos;s ready.</Notice> : null}
      <Panel className="max-w-4xl p-6 sm:p-8">
        <ContentForm
          d={{
            id: p.id,
            content_type: p.content_type,
            title: p.title,
            slug: p.slug,
            summary: p.summary,
            body: p.body,
            key_takeaways: p.key_takeaways,
            speaker_name: p.speaker_name,
            scripture_reference: p.scripture_reference,
            event_starts_local: utcIsoToLocalInput(p.event_starts_at),
            event_ends_local: utcIsoToLocalInput(p.event_ends_at),
            event_location: p.event_location,
            cover_image_path: p.cover_image_path,
            media_paths: p.media_paths,
            is_featured: p.is_featured,
            display_order: p.display_order,
            people_consent_confirmed: p.people_consent_confirmed,
            status: p.status,
          }}
        />
      </Panel>
    </>
  );
}
