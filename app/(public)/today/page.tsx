import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Award, BookOpen, Camera, CalendarDays, Megaphone, Quote, Sparkles } from "lucide-react";
import { getTodayPageData } from "@/lib/data/content";
import { publicMediaUrl } from "@/lib/env";
import { formatCalendarDate, formatDate, formatLongDate } from "@/lib/time";
import { EventListItem, MediaItem, PostBody } from "@/components/site/content-bits";
import { EmptyState } from "@/components/ui/display";
import { PageHero, Eyebrow } from "@/components/site/page-hero";
import { SunRays, WheatField } from "@/components/site/art";

export const metadata: Metadata = {
  title: "Today at Epe",
  description: "This week's message, moments from service, recognitions and what's coming up at Harvesters Epe.",
};
export const revalidate = 60;

export default async function TodayPage() {
  const { message, highlights, media, recognitions, announcements, events } = await getTodayPageData();
  const nothing = !message && highlights.length === 0 && media.length === 0 && recognitions.length === 0 && announcements.length === 0;

  return (
    <>
    <PageHero
      eyebrow={formatLongDate(new Date().toISOString())}
      icon={<CalendarDays aria-hidden />}
      title={<>Today at <span className="hc-gold-text">Epe.</span></>}
      description="This week's message, moments from service, shout-outs and what's coming up."
    />
    <div className="mx-auto max-w-6xl px-5 pt-12 sm:px-8 sm:pt-16">

      {nothing ? (
        <EmptyState
          className="rounded-lg border border-dashed border-line-strong bg-surface"
          icon={<BookOpen />}
          title="Nothing posted yet today"
          description="The message, photos and highlights from service will appear here once the media team publishes them."
        />
      ) : null}

      {message ? (
        <article className="hc-reveal relative isolate overflow-hidden rounded-lg bg-night text-white">
          <div className="hc-dots absolute inset-0 -z-10 opacity-50" aria-hidden />
          <SunRays className="absolute -left-60 -top-60 -z-10 size-[640px] opacity-50" />
          <WheatField className="absolute -bottom-10 right-0 -z-10 hidden h-52 opacity-30 lg:block" />
          <div className="grid gap-10 p-7 sm:p-12 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold-light">
                <BookOpen className="size-3.5" aria-hidden /> Today&apos;s message
              </p>
              <p className="mt-4 text-sm text-white/55">
                {[message.speaker_name, message.scripture_reference].filter(Boolean).join(" · ") || "Today's message"}
              </p>
              <h2 className="mt-3 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.025em] text-white sm:text-[2.6rem]">{message.title}</h2>
              {message.summary ? <p className="mt-5 text-lg leading-relaxed text-white/80">{message.summary}</p> : null}
              {message.body ? <PostBody body={message.body} className="mt-6 space-y-4 leading-relaxed text-white/75" /> : null}
            </div>
            {message.key_takeaways.length > 0 ? (
              <div className="rounded-md border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-gold-light"><Quote className="size-4" aria-hidden /> Key takeaways</h3>
                <ol className="mt-4 space-y-5">
                  {message.key_takeaways.map((t, i) => (
                    <li key={i} className="grid grid-cols-[1.75rem_1fr] gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-gold text-xs font-bold tabular-nums text-night">{i + 1}</span>
                      <span className="leading-relaxed text-white/90">{t}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
          {message.cover_image_path ? <MediaItem path={message.cover_image_path} alt="" className="max-h-[420px] w-full object-cover" /> : null}
        </article>
      ) : null}

      {recognitions.length > 0 ? (
        <section aria-labelledby="recognitions" className="hc-reveal mt-20">
          <Eyebrow><Award className="size-3.5" aria-hidden /> Celebrating you</Eyebrow>
          <h2 id="recognitions" className="mt-3 text-h2 text-ink">This week&apos;s shout-outs</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recognitions.map((r) => {
              const img = publicMediaUrl(r.image_path);
              return (
                <li key={r.id} className="group hc-lift overflow-hidden rounded-md border border-line bg-surface">
                  <div className="relative aspect-square overflow-hidden bg-night">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={r.display_name} loading="lazy" className="hc-zoom size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <div className="hc-dots absolute inset-0 opacity-60" aria-hidden />
                        <Sparkles className="relative size-10 text-gold" aria-hidden />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-night">
                      <Award className="size-3" aria-hidden /> {r.recognition_title}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="mt-0.5 text-lg font-bold text-ink">{r.display_name}</p>
                    {r.description ? <p className="mt-1 text-sm text-muted">{r.description}</p> : null}
                    <p className="mt-2 text-xs text-subtle">{formatCalendarDate(r.display_date)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {media.length > 0 ? (
        <section aria-labelledby="moments" className="hc-reveal mt-20">
          <Eyebrow><Camera className="size-3.5" aria-hidden /> Gallery</Eyebrow>
          <h2 id="moments" className="mt-3 text-h2 text-ink">Moments from service</h2>
          <div className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
            {media.flatMap((post) =>
              [post.cover_image_path, ...post.media_paths].filter((p): p is string => Boolean(p)).map((path) => (
                <figure key={`${post.id}-${path}`} className="group break-inside-avoid">
                  <div className="overflow-hidden rounded-md">
                    <MediaItem path={path} alt={post.title} className="hc-zoom w-full rounded-md object-cover" />
                  </div>
                  <figcaption className="mt-2 text-sm text-muted">{post.title}</figcaption>
                </figure>
              )),
            )}
          </div>
        </section>
      ) : null}

      {highlights.length > 0 ? (
        <section aria-labelledby="highlights" className="hc-reveal mt-20">
          <Eyebrow><Sparkles className="size-3.5" aria-hidden /> Highlights</Eyebrow>
          <h2 id="highlights" className="mt-3 text-h2 text-ink">What stood out</h2>
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {highlights.map((h) => (
              <li key={h.id} className="hc-lift rounded-md border border-line bg-surface p-6">
                {h.cover_image_path ? <MediaItem path={h.cover_image_path} alt="" className="mb-5 aspect-[16/9] w-full rounded-sm object-cover" /> : null}
                <h3 className="text-h3 text-ink">{h.title}</h3>
                {h.summary ? <p className="mt-2 text-muted">{h.summary}</p> : null}
                <p className="mt-3 text-xs text-subtle">{formatDate(h.published_at)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {announcements.length > 0 || events.length > 0 ? (
        <section className="hc-reveal mt-20 grid gap-12 lg:grid-cols-2">
          {announcements.length > 0 ? (
            <div>
              <h2 className="flex items-center gap-2 text-h2 text-ink">
                <span className="flex size-9 items-center justify-center rounded-full bg-ink text-gold-light"><Megaphone className="size-4" aria-hidden /></span> Announcements
              </h2>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {announcements.map((a) => (
                  <li key={a.id}>
                    <Link href={`/news/${a.slug ?? a.id}`} className="group -mx-3 flex items-start gap-3 rounded-sm px-3 py-5 transition-colors hover:bg-surface">
                      <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink"><span className="hc-underline">{a.title}</span></p>
                      {a.summary ? <p className="mt-1 text-sm text-muted">{a.summary}</p> : null}
                      </div>
                      <ArrowUpRight className="hc-nudge mt-1 size-4 shrink-0 text-subtle group-hover:text-accent" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {events.length > 0 ? (
            <div>
              <h2 className="flex items-center gap-2 text-h2 text-ink"><span className="flex size-9 items-center justify-center rounded-full bg-ink text-gold-light"><CalendarDays className="size-4" aria-hidden /></span> Upcoming programmes</h2>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {events.map((e) => <EventListItem key={e.id} event={e} />)}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
    </>
  );
}
