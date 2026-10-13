import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock, MapPin, Megaphone, Newspaper } from "lucide-react";
import { publicMediaUrl } from "@/lib/env";
import { formatDate, formatLongDate, formatTime } from "@/lib/time";
import type { Tables } from "@/types/database";
import { DateBlock } from "@/components/site/date-block";
import { CoverArt } from "@/components/site/art";
import { cn } from "@/lib/utils";

type Post = Tables<"content_posts">;

/** Plain-text body: paragraphs on blank lines, line breaks kept. No HTML is ever injected. */
export function PostBody({ body, className }: { body: string | null; className?: string }) {
  if (!body) return null;
  const paragraphs = body.replace(/\r\n/g, "\n").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className={className ?? "space-y-5 text-[17px] leading-[1.8] text-text"}>
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line">{p}</p>
      ))}
    </div>
  );
}

export function isVideoPath(path: string): boolean {
  return /\.(mp4|webm)$/i.test(path);
}

export function MediaItem({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const url = publicMediaUrl(path);
  if (!url) return null;
  if (isVideoPath(path)) {
    return <video src={url} controls preload="metadata" playsInline className={className ?? "w-full rounded-md bg-ink"} aria-label={alt} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} loading="lazy" decoding="async" className={className ?? "w-full rounded-md object-cover"} />;
}

/** Cover photo, or generated artwork when there isn't one. */
export function Cover({ path, seed, className, imgClassName }: { path: string | null; seed: string; className?: string; imgClassName?: string }) {
  const url = path && !isVideoPath(path) ? publicMediaUrl(path) : null;
  return (
    <div className={cn("relative overflow-hidden bg-night", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" decoding="async" className={cn("hc-zoom size-full object-cover", imgClassName)} />
      ) : (
        <CoverArt seed={seed} className="hc-zoom absolute inset-0" />
      )}
    </div>
  );
}

export function PostListItem({ post, href }: { post: Post; href: string }) {
  const isAnnouncement = post.content_type === "announcement";
  return (
    <li className="hc-reveal">
      <Link href={href} className="group hc-lift flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface">
        <div className="relative">
          <Cover path={post.cover_image_path} seed={post.id} className="aspect-[16/10]" />
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-light backdrop-blur-md">
            {isAnnouncement ? <Megaphone className="size-3" aria-hidden /> : <Newspaper className="size-3" aria-hidden />}
            {isAnnouncement ? "Announcement" : "News"}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <p className="text-xs font-semibold text-subtle">{formatDate(post.published_at)}</p>
          <h2 className="mt-1.5 text-h3 font-bold text-ink">
            <span className="hc-underline">{post.title}</span>
          </h2>
          {post.summary ? <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-muted">{post.summary}</p> : null}
          <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-accent">
            Read more <ArrowUpRight className="hc-nudge size-4" aria-hidden />
          </span>
        </div>
      </Link>
    </li>
  );
}

/** Event as a card: cover with a calendar tile, then title, time and place. */
export function EventCard({ event, featured = false }: { event: Post; featured?: boolean }) {
  return (
    <li className={cn("hc-reveal", featured && "md:col-span-2")}>
      <Link
        href={`/events/${event.slug ?? event.id}`}
        className={cn("group hc-lift flex h-full overflow-hidden rounded-md border border-line bg-surface", featured ? "flex-col md:flex-row" : "flex-col")}
      >
        <div className={cn("relative", featured ? "md:w-[55%]" : "")}>
          <Cover path={event.cover_image_path} seed={event.id} className={cn(featured ? "aspect-[16/10] md:aspect-auto md:h-full md:min-h-72" : "aspect-[16/10]")} />
          <DateBlock iso={event.event_starts_at} tone="glass" className="absolute left-4 top-4" />
          {featured ? (
            <span className="absolute bottom-4 left-4 rounded-full bg-gold px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-night">Next up</span>
          ) : null}
        </div>
        <div className={cn("flex flex-1 flex-col p-5", featured && "md:p-8")}>
          <h2 className={cn("font-bold text-ink", featured ? "text-h2" : "text-h3")}>
            <span className="hc-underline">{event.title}</span>
          </h2>
          <EventMeta event={event} className="mt-3" />
          {event.summary ? <p className={cn("mt-3 text-[15px] leading-relaxed text-muted", featured ? "line-clamp-4" : "line-clamp-2")}>{event.summary}</p> : null}
          <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-accent">
            Event details <ArrowUpRight className="hc-nudge size-4" aria-hidden />
          </span>
        </div>
      </Link>
    </li>
  );
}

export function EventMeta({ event, className }: { event: Post; className?: string }) {
  return (
    <p className={cn("flex flex-col gap-1.5 text-sm text-muted", className)}>
      {event.event_starts_at ? (
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="size-4 text-accent" aria-hidden />
          {formatLongDate(event.event_starts_at)}
        </span>
      ) : null}
      {event.event_starts_at ? (
        <span className="inline-flex items-center gap-2">
          <Clock className="size-4 text-accent" aria-hidden />
          {formatTime(event.event_starts_at)}
        </span>
      ) : null}
      {event.event_location ? (
        <span className="inline-flex items-center gap-2">
          <MapPin className="size-4 text-accent" aria-hidden />
          {event.event_location}
        </span>
      ) : null}
    </p>
  );
}

/** Compact row: calendar tile beside title and details. */
export function EventListItem({ event }: { event: Post }) {
  return (
    <li>
      <Link href={`/events/${event.slug ?? event.id}`} className="group -mx-3 flex gap-5 rounded-sm px-3 py-5 transition-colors hover:bg-surface">
        <DateBlock iso={event.event_starts_at} />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-ink"><span className="hc-underline">{event.title}</span></h2>
          <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {event.event_starts_at ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 text-accent" aria-hidden />
                {formatTime(event.event_starts_at)}
              </span>
            ) : null}
            {event.event_location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-accent" aria-hidden />
                {event.event_location}
              </span>
            ) : null}
          </p>
          {event.summary ? <p className="mt-2 line-clamp-2 text-sm text-muted">{event.summary}</p> : null}
        </div>
        <ArrowUpRight className="hc-nudge mt-1 size-4 shrink-0 text-subtle group-hover:text-accent" aria-hidden />
      </Link>
    </li>
  );
}
