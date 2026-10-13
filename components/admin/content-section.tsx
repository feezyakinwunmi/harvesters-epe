import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, FilePlus2, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { moveContentForm, setContentStatus } from "@/lib/actions/content-admin";
import { CONTENT_META, SECTION_TYPES, type ContentType } from "@/lib/validation/content";
import { PageHeader } from "@/components/admin/page-header";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Badge, EmptyState, Notice, Panel } from "@/components/ui/display";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

const STATUS_TONE = { draft: "outline", published: "success", archived: "neutral" } as const;

export async function ContentSection({
  section,
  title,
  description,
  sp,
  extraActions,
}: {
  section: "today" | "news" | "events";
  title: string;
  description: string;
  sp: { type?: string; status?: string; deleted?: string };
  extraActions?: React.ReactNode;
}) {
  const types = SECTION_TYPES[section];
  const type = types.includes(sp.type as ContentType) ? (sp.type as ContentType) : null;
  const status = ["draft", "published", "archived"].includes(sp.status ?? "") ? (sp.status as "draft" | "published" | "archived") : null;
  const supabase = await createClient();

  let q = supabase
    .from("content_posts")
    .select("id, content_type, title, status, is_featured, display_order, published_at, updated_at, event_starts_at, media_paths")
    .in("content_type", type ? [type] : types)
    .is("deleted_at", null);
  q = status ? q.eq("status", status) : q.neq("status", "archived");
  q = section === "events"
    ? q.order("event_starts_at", { ascending: false, nullsFirst: true })
    : q.order("display_order").order("updated_at", { ascending: false });
  const { data, error } = await q.limit(200);
  const rows = data ?? [];
  const base = `/admin/${section}`;
  const filterHref = (over: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { type: type as string | null, status: status as string | null, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  };

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {extraActions}
            {types.map((t) => (
              <Button key={t} asChild variant={t === types[0] ? "primary" : "secondary"} size="sm">
                <Link href={`/admin/content/new?type=${t}`}><FilePlus2 aria-hidden /> {CONTENT_META[t].newLabel}</Link>
              </Button>
            ))}
          </>
        }
      />
      {sp.deleted ? <Notice tone="success" className="mb-6">Deleted.</Notice> : null}
      <Panel>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line px-4 py-3 text-sm">
          {types.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {[null, ...types].map((t) => (
                <Link key={t ?? "all"} href={filterHref({ type: t })} className={cn("rounded-sm px-2.5 py-1 font-semibold", type === t ? "bg-ink text-white" : "text-muted hover:bg-fill hover:text-ink")}>
                  {t ? CONTENT_META[t].label : "All"}
                </Link>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1">
            {([null, "draft", "published", "archived"] as const).map((s) => (
              <Link key={s ?? "current"} href={filterHref({ status: s })} className={cn("rounded-sm px-2.5 py-1 font-semibold", status === s ? "bg-fill text-ink" : "text-muted hover:text-ink")}>
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : "Current"}
              </Link>
            ))}
          </div>
        </div>
        {error ? (
          <Notice tone="danger" className="m-4">Content couldn&apos;t load.</Notice>
        ) : rows.length === 0 ? (
          <EmptyState icon={<FilePlus2 />} title="Nothing here yet" description="Create a draft, preview it, then publish when it's ready." />
        ) : (
          <Table caption={title}>
            <THead>
              <tr>
                {section !== "events" ? <TH className="w-20">Order</TH> : null}
                <TH>Title</TH>
                <TH>Type</TH>
                <TH>Status</TH>
                <TH className="hidden md:table-cell">{section === "events" ? "Event date" : "Updated"}</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((r, i) => (
                <TR key={r.id}>
                  {section !== "events" ? (
                    <TD>
                      <div className="flex gap-0.5">
                        <form action={moveContentForm}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button type="submit" disabled={i === 0} className="rounded-sm p-1 text-muted hover:bg-fill hover:text-ink disabled:opacity-30" aria-label={`Move ${r.title} up`}><ArrowUp className="size-4" /></button>
                        </form>
                        <form action={moveContentForm}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button type="submit" disabled={i === rows.length - 1} className="rounded-sm p-1 text-muted hover:bg-fill hover:text-ink disabled:opacity-30" aria-label={`Move ${r.title} down`}><ArrowDown className="size-4" /></button>
                        </form>
                      </div>
                    </TD>
                  ) : null}
                  <TD>
                    <Link href={`/admin/content/${r.id}`} className="font-semibold text-ink hover:underline">{r.title}</Link>
                    {r.is_featured ? <Badge tone="accent" className="ml-2">Featured</Badge> : null}
                    {r.media_paths.length ? <span className="block text-xs text-muted">{r.media_paths.length} file{r.media_paths.length === 1 ? "" : "s"}</span> : null}
                  </TD>
                  <TD className="text-muted">{CONTENT_META[r.content_type as ContentType]?.label ?? r.content_type}</TD>
                  <TD><Badge tone={STATUS_TONE[r.status]}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</Badge></TD>
                  <TD className="hidden whitespace-nowrap text-muted md:table-cell">{section === "events" ? formatDateTime(r.event_starts_at) : formatDate(r.updated_at)}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm"><Link href={`/admin/content/${r.id}/preview`}><Eye aria-hidden /> Preview</Link></Button>
                      <Button asChild variant="ghost" size="sm"><Link href={`/admin/content/${r.id}`}><Pencil aria-hidden /> Edit</Link></Button>
                      {r.status !== "published" ? (
                        <ConfirmAction action={setContentStatus} hidden={{ id: r.id, status: "published" }} title={`Publish "${r.title}"?`} description="It will appear on the public website straight away." confirmLabel="Publish" trigger="Publish" triggerVariant="secondary" />
                      ) : (
                        <ConfirmAction action={setContentStatus} hidden={{ id: r.id, status: "draft" }} title="Unpublish?" description="It disappears from the website and goes back to drafts." confirmLabel="Unpublish" trigger="Unpublish" triggerVariant="ghost" />
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
