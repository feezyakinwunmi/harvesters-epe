import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Tables } from "@/types/database";

export type Post = Tables<"content_posts">;
export type ContentType = Post["content_type"];

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  today_message: "Today's message",
  service_photo: "Photos",
  service_video: "Video",
  highlight: "Highlight",
  news: "News",
  announcement: "Announcement",
  event: "Event",
};

// Public pages rely on RLS (published + not deleted + published_at <= now)
// and filter again explicitly so an admin browsing the public site sees
// exactly what visitors see.
const PUBLISHED = { status: "published" as const };

// Published content is the same for every visitor, so it is read with the
// anonymous client and cached across requests. Admin saves call
// revalidateTag(CONTENT_TAG); otherwise entries refresh every 60 seconds.
export const CONTENT_TAG = "content";
const cached = <A extends unknown[], R>(key: string, fn: (...args: A) => Promise<R>) =>
  unstable_cache(fn, [key], { tags: [CONTENT_TAG], revalidate: 60 });

async function loadPublishedPosts(types: string[], limit = 20, offset = 0) {
  const supabase = createPublicClient();
  const { data, count } = await supabase.from("content_posts").select("*", { count: "exact" }).in("content_type", types).match(PUBLISHED).is("deleted_at", null).lte("published_at", new Date().toISOString())
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return { posts: data ?? [], total: count ?? 0 };
}

async function loadPublishedPost(types: string[], slugOrId: string) {
  const supabase = createPublicClient();
  const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
  const { data } = await supabase.from("content_posts").select("*").in("content_type", types).eq(isUuid ? "id" : "slug", slugOrId).match(PUBLISHED).is("deleted_at", null).lte("published_at", new Date().toISOString()).maybeSingle();
  return data ?? null;
}

async function loadUpcomingEvents(limit = 6) {
  const supabase = createPublicClient();
  const now = new Date().toISOString();
  const { data } = await supabase.from("content_posts").select("*").eq("content_type", "event").match(PUBLISHED).is("deleted_at", null).lte("published_at", new Date().toISOString())
    .or(`event_ends_at.gte.${now},and(event_ends_at.is.null,event_starts_at.gte.${now})`)
    .order("event_starts_at", { ascending: true })
    .limit(limit);
  return data ?? [];
}

async function loadPastEvents(limit = 6) {
  const supabase = createPublicClient();
  const now = new Date().toISOString();
  const { data } = await supabase.from("content_posts").select("*").eq("content_type", "event").match(PUBLISHED).is("deleted_at", null).lte("published_at", new Date().toISOString())
    .lt("event_starts_at", now)
    .order("event_starts_at", { ascending: false })
    .limit(limit);
  return (data ?? []).filter((e) => !e.event_ends_at || e.event_ends_at < now);
}

async function loadTodayPageData() {
  const supabase = createPublicClient();
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10);

  const [message, highlights, media, recognitions, announcements, events] = await Promise.all([
    supabase.from("content_posts").select("*").eq("content_type", "today_message").match(PUBLISHED).is("deleted_at", null).lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("content_posts").select("*").eq("content_type", "highlight").match(PUBLISHED).is("deleted_at", null).lte("published_at", new Date().toISOString())
      .order("display_order", { ascending: true })
      .order("published_at", { ascending: false })
      .limit(6),
    supabase.from("content_posts").select("*").in("content_type", ["service_photo", "service_video"]).match(PUBLISHED).is("deleted_at", null).lte("published_at", new Date().toISOString())
      .order("display_order", { ascending: true })
      .order("published_at", { ascending: false })
      .limit(8),
    supabase
      .from("member_recognitions")
      .select("id, display_name, recognition_title, description, image_path, display_date, display_order")
      .eq("status", "published")
      .gte("display_date", since)
      .order("display_date", { ascending: false })
      .order("display_order", { ascending: true })
      .limit(8),
    supabase.from("content_posts").select("*").eq("content_type", "announcement").match(PUBLISHED).is("deleted_at", null).lte("published_at", new Date().toISOString())
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(5),
    loadUpcomingEvents(4),
  ]);

  return {
    message: message.data ?? null,
    highlights: highlights.data ?? [],
    media: media.data ?? [],
    recognitions: recognitions.data ?? [],
    announcements: announcements.data ?? [],
    events,
  };
}

export const getPublishedPosts = cached("getPublishedPosts", loadPublishedPosts);
export const getPublishedPost = cached("getPublishedPost", loadPublishedPost);
export const getUpcomingEvents = cached("getUpcomingEvents", loadUpcomingEvents);
export const getPastEvents = cached("getPastEvents", loadPastEvents);
export const getTodayPageData = cached("getTodayPageData", loadTodayPageData);
