"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/data/content";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/session";
import { errorMessage, friendlyDbError, invalid, type ActionState } from "@/lib/actions/result";
import { CONTENT_META, CONTENT_TYPES, isContentType, isSafeMediaPath } from "@/lib/validation/content";
import { localInputToUtcIso } from "@/lib/time";
import { slugify } from "@/lib/text";

const contentSchema = z
  .object({
    id: z.string().uuid().optional().or(z.literal("")),
    content_type: z.enum(CONTENT_TYPES),
    title: z.string().trim().min(2, "Add a title").max(200),
    slug: z.string().trim().max(80).optional(),
    summary: z.string().trim().max(600).optional(),
    body: z.string().trim().max(20000).optional(),
    key_takeaways: z.string().max(4000).optional(),
    speaker_name: z.string().trim().max(120).optional(),
    scripture_reference: z.string().trim().max(120).optional(),
    event_starts_at: z.string().optional(),
    event_ends_at: z.string().optional(),
    event_location: z.string().trim().max(200).optional(),
    cover_image_path: z.string().max(200).optional(),
    media_paths: z.array(z.string().max(200)).max(40),
    display_order: z.coerce.number().int().min(-1000).max(1000).optional(),
    is_featured: z.boolean(),
    people_consent_confirmed: z.boolean(),
    intent: z.enum(["draft", "publish"]),
  })
  .superRefine((v, ctx) => {
    if (v.cover_image_path && !isSafeMediaPath(v.cover_image_path)) ctx.addIssue({ code: "custom", path: ["cover_image_path"], message: "Upload the image again" });
    for (const p of v.media_paths) if (!isSafeMediaPath(p)) ctx.addIssue({ code: "custom", path: ["media_paths"], message: "One of the files is invalid. Remove it and upload again." });
    if (v.content_type === "event") {
      if (!v.event_starts_at) ctx.addIssue({ code: "custom", path: ["event_starts_at"], message: "When does the event start?" });
      const s = localInputToUtcIso(v.event_starts_at);
      const e = localInputToUtcIso(v.event_ends_at);
      if (s && e && e < s) ctx.addIssue({ code: "custom", path: ["event_ends_at"], message: "End must be after the start" });
    }
    if ((v.content_type === "service_photo" || v.content_type === "service_video") && v.media_paths.length === 0 && !v.cover_image_path) {
      ctx.addIssue({ code: "custom", path: ["media_paths"], message: "Upload at least one file" });
    }
    if (v.intent === "publish" && CONTENT_META[v.content_type].people && (v.media_paths.length > 0 || v.cover_image_path) && !v.people_consent_confirmed) {
      ctx.addIssue({ code: "custom", path: ["people_consent_confirmed"], message: "Confirm consent before publishing photos or videos of people" });
    }
  });

function sectionPath(type: string) {
  return isContentType(type) ? `/admin/${CONTENT_META[type].section}` : "/admin/today";
}

function revalidatePublic() {
  revalidateTag(CONTENT_TAG);
  for (const p of ["/", "/today", "/news", "/events"]) revalidatePath(p);
}

export async function saveContent(_: ActionState, form: FormData): Promise<ActionState> {
  let target: string | null = null;
  try {
    await requirePermission("content.manage");
    let media: unknown = [];
    try {
      media = JSON.parse(String(form.get("media_paths") ?? "[]"));
    } catch {
      media = [];
    }
    const parsed = contentSchema.safeParse({
      ...Object.fromEntries(form),
      media_paths: media,
      is_featured: form.get("is_featured") === "on",
      people_consent_confirmed: form.get("people_consent_confirmed") === "on",
      intent: form.get("intent") === "publish" ? "publish" : "draft",
    });
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    const supabase = await createClient();

    const takeaways = (v.key_takeaways ?? "").split("\n").map((t) => t.trim()).filter(Boolean).slice(0, 10);
    const baseSlug = slugify(v.slug || v.title) || null;
    const row = {
      content_type: v.content_type,
      title: v.title,
      summary: v.summary || null,
      body: v.body || null,
      key_takeaways: v.content_type === "today_message" ? takeaways : [],
      speaker_name: v.speaker_name || null,
      scripture_reference: v.scripture_reference || null,
      event_starts_at: v.content_type === "event" ? localInputToUtcIso(v.event_starts_at) : null,
      event_ends_at: v.content_type === "event" ? localInputToUtcIso(v.event_ends_at) : null,
      event_location: v.content_type === "event" ? v.event_location || null : null,
      cover_image_path: v.cover_image_path || null,
      media_paths: v.media_paths,
      is_featured: v.is_featured,
      display_order: v.display_order ?? 0,
      people_consent_confirmed: v.people_consent_confirmed,
      ...(v.intent === "publish" ? { status: "published" as const } : {}),
    };

    // Files removed from the post are deleted from the public bucket after a successful save.
    let removed: string[] = [];
    let id = v.id || null;

    for (let attempt = 0; attempt < 4; attempt++) {
      const slug = baseSlug ? (attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`) : null;
      if (id) {
        const { data: before } = await supabase.from("content_posts").select("cover_image_path, media_paths, slug").eq("id", id).maybeSingle();
        if (!before) return { ok: false, message: "This post no longer exists." };
        const { error } = await supabase.from("content_posts").update({ ...row, slug: v.slug ? slug : (before.slug ?? slug) }).eq("id", id);
        if (error?.code === "23505") continue;
        if (error) return { ok: false, message: friendlyDbError(error) };
        const keep = new Set([...(row.media_paths ?? []), ...(row.cover_image_path ? [row.cover_image_path] : [])]);
        removed = [...before.media_paths, ...(before.cover_image_path ? [before.cover_image_path] : [])].filter((p) => !keep.has(p));
      } else {
        const { data, error } = await supabase.from("content_posts").insert({ ...row, slug }).select("id").single();
        if (error?.code === "23505") continue;
        if (error || !data) return { ok: false, message: friendlyDbError(error) };
        id = data.id;
      }
      break;
    }
    if (!id) return { ok: false, message: "Couldn't find a free web address for this title. Set one manually." };

    if (removed.length) await supabase.storage.from("church-public-media").remove(removed);
    revalidatePublic();
    revalidatePath(sectionPath(v.content_type));
    if (v.id) {
      revalidatePath(`/admin/content/${id}`);
      return { ok: true, message: v.intent === "publish" ? "Published" : "Saved" };
    }
    target = `/admin/content/${id}?saved=1`;
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
  if (target) redirect(target);
  return { ok: false };
}

export async function setContentStatus(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("content.manage");
    const id = z.string().uuid().parse(form.get("id"));
    const status = z.enum(["draft", "published", "archived"]).parse(form.get("status"));
    const supabase = await createClient();
    const { data, error } = await supabase.from("content_posts").update({ status }).eq("id", id).select("content_type").single();
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidatePublic();
    revalidatePath(sectionPath(data.content_type));
    revalidatePath(`/admin/content/${id}`);
    return { ok: true, message: status === "published" ? "Published" : status === "archived" ? "Archived" : "Moved to drafts" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

/** Swap display order with the neighbouring post of the same type. */
export async function moveContent(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("content.manage");
    const id = z.string().uuid().parse(form.get("id"));
    const dir = form.get("direction") === "up" ? -1 : 1;
    const supabase = await createClient();
    const { data: me } = await supabase.from("content_posts").select("content_type").eq("id", id).single();
    if (!me) return { ok: false, message: "Post not found." };
    const { data: list } = await supabase
      .from("content_posts")
      .select("id, display_order")
      .eq("content_type", me.content_type)
      .is("deleted_at", null)
      .neq("status", "archived")
      .order("display_order")
      .order("published_at", { ascending: false, nullsFirst: true });
    const items = list ?? [];
    const i = items.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= items.length) return { ok: true };
    const reordered = [...items];
    [reordered[i], reordered[j]] = [reordered[j]!, reordered[i]!];
    await Promise.all(reordered.map((x, idx) => (x.display_order === idx ? null : supabase.from("content_posts").update({ display_order: idx }).eq("id", x.id))));
    revalidatePublic();
    revalidatePath(sectionPath(me.content_type));
    return { ok: true, message: "Order updated" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

/** Soft delete (recoverable by a super admin in the database). */
export async function deleteContent(_: ActionState, form: FormData): Promise<ActionState> {
  let target: string | null = null;
  try {
    await requirePermission("content.manage");
    const id = z.string().uuid().parse(form.get("id"));
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("content_posts")
      .update({ deleted_at: new Date().toISOString(), status: "archived" })
      .eq("id", id)
      .select("content_type")
      .single();
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidatePublic();
    target = `${sectionPath(data.content_type)}?deleted=1`;
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
  if (target) redirect(target);
  return { ok: false };
}

/** Permanent delete: super admins only, typed DELETE, removes files from Storage. */
export async function purgeContent(_: ActionState, form: FormData): Promise<ActionState> {
  let target: string | null = null;
  try {
    await requirePermission("content.hard_delete");
    if (form.get("confirm") !== "DELETE") return { ok: false, message: "Type DELETE exactly to confirm." };
    const id = z.string().uuid().parse(form.get("id"));
    const supabase = await createClient();
    const { data: post } = await supabase.from("content_posts").select("content_type, cover_image_path, media_paths").eq("id", id).maybeSingle();
    if (!post) return { ok: false, message: "Post not found." };
    const { error } = await supabase.from("content_posts").delete().eq("id", id);
    if (error) return { ok: false, message: friendlyDbError(error) };
    const files = [...post.media_paths, ...(post.cover_image_path ? [post.cover_image_path] : [])];
    if (files.length) await supabase.storage.from("church-public-media").remove(files);
    revalidatePublic();
    target = `${sectionPath(post.content_type)}?deleted=1`;
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
  if (target) redirect(target);
  return { ok: false };
}

/** Form-action wrapper for the reorder arrows. */
export async function moveContentForm(form: FormData): Promise<void> {
  await moveContent({ ok: false }, form);
}
