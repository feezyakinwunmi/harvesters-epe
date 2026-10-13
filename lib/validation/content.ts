export const CONTENT_TYPES = ["today_message", "service_photo", "service_video", "highlight", "news", "announcement", "event"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_META: Record<ContentType, { label: string; section: "today" | "news" | "events"; newLabel: string; people: boolean }> = {
  today_message: { label: "Today's message", section: "today", newLabel: "New message", people: false },
  service_photo: { label: "Photos", section: "today", newLabel: "Add photos", people: true },
  service_video: { label: "Video", section: "today", newLabel: "Add video", people: true },
  highlight: { label: "Highlight", section: "today", newLabel: "New highlight", people: true },
  news: { label: "News", section: "news", newLabel: "New article", people: false },
  announcement: { label: "Announcement", section: "news", newLabel: "New announcement", people: false },
  event: { label: "Event", section: "events", newLabel: "New event", people: false },
};

export const SECTION_TYPES: Record<"today" | "news" | "events", ContentType[]> = {
  today: ["today_message", "highlight", "service_photo", "service_video"],
  news: ["news", "announcement"],
  events: ["event"],
};

export function isContentType(v: unknown): v is ContentType {
  return typeof v === "string" && (CONTENT_TYPES as readonly string[]).includes(v);
}

/** Public media objects must live under these prefixes (also enforced by Storage RLS). */
export function isSafeMediaPath(path: string, prefix: "content" | "recognitions" = "content"): boolean {
  return new RegExp(`^${prefix}/\\d{4}/\\d{2}/[0-9a-f-]{36}\\.(jpg|jpeg|png|webp|gif|mp4|webm)$`, "i").test(path);
}
