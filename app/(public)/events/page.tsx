import type { Metadata } from "next";
import { CalendarDays, History } from "lucide-react";
import { getPastEvents, getUpcomingEvents } from "@/lib/data/content";
import { EventCard, EventListItem } from "@/components/site/content-bits";
import { PageHero, Eyebrow } from "@/components/site/page-hero";
import { WheatSprig } from "@/components/site/art";

export const metadata: Metadata = { title: "Events", description: "Upcoming programmes at Harvesters Epe." };
export const revalidate = 60;

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([getUpcomingEvents(30), getPastEvents(6)]);
  return (
    <>
      <PageHero
        eyebrow="Events"
        icon={<CalendarDays aria-hidden />}
        title={<>Gather with us at <span className="hc-gold-text">Epe.</span></>}
        description="Programmes, conferences and gatherings at the Epe campus. Save the date and bring someone along."
      >
        {upcoming.length > 0 ? (
          <p className="inline-flex items-center gap-2 text-sm text-white/60">
            <span className="flex size-6 items-center justify-center rounded-full bg-gold text-xs font-bold text-night">{upcoming.length}</span>
            upcoming {upcoming.length === 1 ? "event" : "events"}
          </p>
        ) : null}
      </PageHero>

      <div className="mx-auto max-w-6xl px-5 pt-14 sm:px-8 sm:pt-20">
        {upcoming.length === 0 ? (
          <div className="relative flex flex-col items-center overflow-hidden rounded-lg border border-dashed border-line-strong bg-surface px-6 py-20 text-center">
            <div className="hc-dots-ink absolute inset-0" aria-hidden />
            <WheatSprig className="relative h-20" />
            <p className="relative mt-5 text-h3 font-bold text-ink">No upcoming events yet</p>
            <p className="relative mt-1 max-w-sm text-muted">New programmes will be listed here as soon as they&apos;re announced.</p>
          </div>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e, i) => (
              <EventCard key={e.id} event={e} featured={i === 0} />
            ))}
          </ul>
        )}

        {past.length > 0 ? (
          <section className="hc-reveal mt-24">
            <Eyebrow><History className="size-3.5" aria-hidden /> Recently</Eyebrow>
            <h2 className="mt-3 text-h2 text-ink">Past gatherings</h2>
            <ul className="mt-6 grid gap-x-10 border-t border-line md:grid-cols-2 [&>li]:border-b [&>li]:border-line">
              {past.map((e) => <EventListItem key={e.id} event={e} />)}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
