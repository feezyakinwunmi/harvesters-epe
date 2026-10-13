import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, MapPin } from "lucide-react";
import { getPublishedPost } from "@/lib/data/content";
import { formatLongDate, formatTime } from "@/lib/time";
import { publicMediaUrl } from "@/lib/env";
import { isVideoPath, MediaItem, PostBody } from "@/components/site/content-bits";
import { DateBlock } from "@/components/site/date-block";
import { SunRays, WheatField } from "@/components/site/art";
import { delay } from "@/components/site/page-hero";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(["event"], slug);
  return post ? { title: post.title, description: post.summary ?? undefined } : { title: "Not found" };
}

export default async function EventPage({ params }: Params) {
  const { slug } = await params;
  const event = await getPublishedPost(["event"], slug);
  if (!event) notFound();

  const sameDay = event.event_starts_at && event.event_ends_at && formatLongDate(event.event_starts_at) === formatLongDate(event.event_ends_at);
  const cover = event.cover_image_path && !isVideoPath(event.cover_image_path) ? publicMediaUrl(event.cover_image_path) : null;
  const time = event.event_starts_at
    ? `${formatTime(event.event_starts_at)}${event.event_ends_at ? (sameDay ? ` – ${formatTime(event.event_ends_at)}` : "") : ""}`
    : null;
  const dateText = event.event_starts_at
    ? `${formatLongDate(event.event_starts_at)}${event.event_ends_at && !sameDay ? ` – ${formatLongDate(event.event_ends_at)}` : ""}`
    : null;

  const details = [
    dateText ? { icon: CalendarDays, label: "Date", value: dateText } : null,
    time ? { icon: Clock, label: "Time", value: time } : null,
    event.event_location ? { icon: MapPin, label: "Venue", value: event.event_location } : null,
  ].filter((d): d is { icon: typeof CalendarDays; label: string; value: string } => Boolean(d));

  return (
    <article>
      {/* Hero: cover photo under a dark wash, or the gold artwork */}
      <header className="relative isolate overflow-hidden bg-night text-white">
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="absolute inset-0 -z-20 size-full scale-105 object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/80 to-night/40" aria-hidden />
          </>
        ) : (
          <>
            <div className="hc-dots absolute inset-0 -z-10 opacity-50" aria-hidden />
            <div aria-hidden className="hc-glow absolute -right-32 -top-40 -z-10 size-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgb(176 141 62 / 0.32), transparent 62%)" }} />
            <SunRays className="absolute -right-48 -top-56 -z-10 size-[660px] opacity-70" />
            <WheatField className="absolute -bottom-10 right-6 -z-10 hidden h-60 opacity-70 sm:block" />
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" aria-hidden />

        <div className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-14">
          <Link href="/events" className="group hc-rise inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-sm font-semibold text-white/80 backdrop-blur hover:text-white">
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden /> All events
          </Link>
          <div className="mt-10 flex items-start gap-5 sm:mt-16">
            <DateBlock iso={event.event_starts_at} tone="glass" className="hc-rise hidden sm:flex" />
            <div className="max-w-3xl">
              <p className="hc-rise text-xs font-semibold uppercase tracking-[0.14em] text-gold-light" style={delay(60)}>Event</p>
              <h1 className="hc-rise mt-3 text-[2.25rem] font-extrabold leading-[1.06] tracking-[-0.035em] text-white sm:text-[3.25rem]" style={delay(120)}>
                {event.title}
              </h1>
              {event.summary ? (
                <p className="hc-rise mt-5 max-w-2xl text-lg leading-relaxed text-white/70" style={delay(200)}>{event.summary}</p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_340px]">
        {/* Details card overlaps the hero */}
        <aside className="relative -mt-10 lg:order-2 lg:-mt-16">
          <div className="hc-rise rounded-md border border-line bg-surface p-6 shadow-lift lg:sticky lg:top-24" style={delay(260)}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Event details</p>
            <dl className="mt-5 space-y-5">
              {details.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-gold-light">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold text-subtle">{label}</dt>
                    <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
            {event.event_location ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.event_location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-white transition-colors hover:bg-night-raised"
              >
                <MapPin className="size-4 text-gold-light" aria-hidden /> Get directions
              </a>
            ) : null}
          </div>
        </aside>

        <div className="pt-4 lg:pt-14">
          {event.cover_image_path && !cover ? <MediaItem path={event.cover_image_path} alt={event.title} className="mb-10 w-full rounded-md bg-ink" /> : null}
          <PostBody body={event.body} className="space-y-5 text-[17px] leading-[1.8] text-text first-letter:float-left first-letter:mr-2 first-letter:text-[3.4rem] first-letter:font-extrabold first-letter:leading-[0.9] first-letter:text-accent" />
          {event.media_paths.length > 0 ? (
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {event.media_paths.map((p) => (
                <div key={p} className="hc-reveal overflow-hidden rounded-md">
                  <MediaItem path={p} alt={event.title} className="w-full rounded-md object-cover transition-transform duration-700 hover:scale-[1.03]" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
