import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { setContentStatus } from "@/lib/actions/content-admin";
import { AccessDenied } from "@/components/admin/access-denied";
import { MediaItem, PostBody } from "@/components/site/content-bits";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Notice } from "@/components/ui/display";
import { CONTENT_META, isContentType } from "@/lib/validation/content";
import { formatLongDate, formatTime } from "@/lib/time";

export const metadata = { title: "Preview" };

/** Renders a post the way the public site will, whatever its status. */
export default async function PreviewContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAdminContext("content.manage", `/admin/content/${id}/preview`);
  if (!ctx) return <AccessDenied />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: p } = await supabase.from("content_posts").select("*").eq("id", id).maybeSingle();
  if (!p || !isContentType(p.content_type)) notFound();

  return (
    <div className="space-y-6">
      <Notice tone={p.status === "published" ? "success" : "warning"} title={p.status === "published" ? "Live on the website" : "Preview — not visible to the public"}>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href={`/admin/content/${id}`} className="inline-flex h-8 items-center rounded-sm border border-line-strong bg-surface px-3 text-sm font-semibold text-ink">Back to editing</Link>
          {p.status !== "published" ? (
            <ConfirmAction action={setContentStatus} hidden={{ id, status: "published" }} title={`Publish "${p.title}"?`} confirmLabel="Publish" trigger="Publish" triggerVariant="primary" />
          ) : null}
        </div>
      </Notice>

      <article className="mx-auto max-w-3xl rounded-md border border-line bg-surface px-6 py-10 sm:px-12">
        <p className="text-sm text-muted">{CONTENT_META[p.content_type].label}{p.speaker_name ? ` · ${p.speaker_name}` : ""}{p.scripture_reference ? ` · ${p.scripture_reference}` : ""}</p>
        <h1 className="mt-2 text-h1 text-ink">{p.title}</h1>
        {p.event_starts_at ? <p className="mt-3 text-muted">{formatLongDate(p.event_starts_at)}, {formatTime(p.event_starts_at)}{p.event_location ? ` · ${p.event_location}` : ""}</p> : null}
        {p.summary ? <p className="mt-4 text-xl leading-relaxed text-muted">{p.summary}</p> : null}
        {p.cover_image_path ? <MediaItem path={p.cover_image_path} alt="" className="mt-8 w-full rounded-md object-cover" /> : null}
        {p.key_takeaways.length ? (
          <ol className="mt-8 space-y-3 border-l-2 border-ink pl-5">
            {p.key_takeaways.map((t, i) => <li key={i} className="text-ink"><span className="mr-2 font-bold text-accent">{i + 1}</span>{t}</li>)}
          </ol>
        ) : null}
        <PostBody body={p.body} className="mt-8 space-y-5 text-[17px] leading-[1.75] text-text" />
        {p.media_paths.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">{p.media_paths.map((m) => <MediaItem key={m} path={m} alt={p.title} />)}</div>
        ) : null}
      </article>
    </div>
  );
}
