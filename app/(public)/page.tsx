import Link from "next/link";
import { ArrowRight, ArrowUpRight, Award, BellRing, BookOpen, HandHeart, KeyRound, ScanLine, ShieldCheck, Smartphone, UserRoundPlus, Zap } from "lucide-react";
import { getCurrentMember, getSessionUser } from "@/lib/auth/session";
import { getPublishedPosts, getUpcomingEvents } from "@/lib/data/content";
import { EventCard } from "@/components/site/content-bits";
import { Ornament, SunRays, WheatField, WheatSprig } from "@/components/site/art";
import { PhoneScene } from "@/components/site/phone-scene";
import { Eyebrow, delay } from "@/components/site/page-hero";

const STEPS = [
  { icon: ScanLine, title: "Scan the code", body: "Point your phone camera at the code on the welcome sheet by the entrance." },
  { icon: UserRoundPlus, title: "First visit? Add your name", body: "Your name and phone number are all we need. Everything else is optional." },
  { icon: Zap, title: "You're checked in", body: "Next time, a single scan does it. This phone remembers you for up to a year." },
];

const BENEFITS = [
  { icon: ScanLine, title: "One-scan check-in", body: "No queues at the welcome desk. Scan, and you're counted." },
  { icon: BellRing, title: "Stay in the loop", body: "Programmes, announcements and Sunday's message in one place." },
  { icon: HandHeart, title: "Find where to serve", body: "Tell us you'd like to join a unit and someone will reach out." },
  { icon: Award, title: "Be celebrated", body: "Birthdays, milestones and weekly shout-outs from the family." },
];

export default async function HomePage() {
  const [user, member, events, message] = await Promise.all([
    getSessionUser(),
    getCurrentMember(),
    getUpcomingEvents(3),
    getPublishedPosts(["today_message"], 1),
  ]);
  const latest = message.posts[0];
  const name = member ? member.preferred_name || member.first_name : null;

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden bg-night text-white">
        <div className="hc-dots absolute inset-0 -z-10 opacity-50" aria-hidden />
        <div
          aria-hidden
          className="hc-glow absolute right-[-10%] top-[-20%] -z-10 size-[760px] rounded-full"
          style={{ background: "radial-gradient(circle, rgb(176 141 62 / 0.32), transparent 60%)" }}
        />
        <SunRays className="absolute -right-40 -top-32 -z-10 size-[820px] opacity-60" />
        <WheatField className="absolute -bottom-8 -left-10 -z-10 h-64 opacity-50 sm:h-80" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" aria-hidden />

        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-28 lg:pt-24">
          <div>
            <p className="hc-rise inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gold-light">
              <span className="relative flex size-2">
                <span className="hc-pulse-ring absolute inset-0 rounded-full bg-gold" />
                <span className="relative size-2 rounded-full bg-gold" />
              </span>
              Harvesters · Epe Campus
            </p>
            <h1 className="hc-rise mt-6 text-[2.75rem] font-extrabold leading-[1.02] tracking-[-0.04em] text-white sm:text-display lg:text-[4.25rem]" style={delay(90)}>
              {name ? (
                <>Welcome back, <span className="hc-gold-text">{name}.</span></>
              ) : (
                <>There&apos;s a seat <span className="hc-gold-text">for you</span> here.</>
              )}
            </h1>
            <p className="hc-rise mt-6 max-w-xl text-lg leading-relaxed text-white/65" style={delay(180)}>
              {name
                ? "You're signed in on this device. At the next service, just scan the code at the entrance and you're checked in."
                : "Register once, then check in to any service by scanning the code at the entrance. No passwords to remember."}
            </p>
            <div className="hc-rise mt-9 flex flex-col gap-3 sm:flex-row" style={delay(270)}>
              {user ? (
                <>
                  <Link href="/me" className="group inline-flex h-13 items-center justify-center gap-2 rounded-full bg-gold px-7 font-semibold text-night transition-colors hover:bg-gold-light">
                    {member ? "My profile & attendance" : "Complete your registration"}
                    <ArrowRight className="hc-nudge size-4" aria-hidden />
                  </Link>
                  <Link href="/today" className="inline-flex h-13 items-center justify-center rounded-full border border-white/20 px-7 font-semibold text-white transition-colors hover:border-gold/60 hover:bg-white/[0.04]">
                    See today at Epe
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register" className="group inline-flex h-13 items-center justify-center gap-2 rounded-full bg-gold px-7 font-semibold text-night transition-colors hover:bg-gold-light">
                    I&apos;m new here <ArrowRight className="hc-nudge size-4" aria-hidden />
                  </Link>
                  <Link href="/sign-in" className="inline-flex h-13 items-center justify-center rounded-full border border-white/20 px-7 font-semibold text-white transition-colors hover:border-gold/60 hover:bg-white/[0.04]">
                    I&apos;ve been here before
                  </Link>
                </>
              )}
            </div>
            <ul className="hc-rise mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/60" style={delay(360)}>
              {[
                { icon: KeyRound, label: "No passwords" },
                { icon: Smartphone, label: "Works on any phone" },
                { icon: ShieldCheck, label: "Private by design" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-2">
                  <Icon className="size-4 text-gold" aria-hidden /> {label}
                </li>
              ))}
            </ul>
          </div>
          <div className="hc-rise hidden sm:block" style={delay(250)}>
            <PhoneScene />
          </div>
        </div>
      </section>

      {/* ---------- How check-in works ---------- */}
      <section aria-labelledby="how" className="relative mx-auto max-w-6xl px-5 pt-20 sm:px-8 sm:pt-28">
        <div className="hc-reveal mx-auto max-w-2xl text-center">
          <Eyebrow className="justify-center">Sunday check-in</Eyebrow>
          <h2 id="how" className="mt-4 text-h1 text-ink">Three steps. A few seconds.</h2>
          <p className="mt-4 text-lg text-muted">Once you&apos;re registered, checking in is a single scan.</p>
        </div>
        <div className="relative mt-14">
        <div aria-hidden className="absolute left-[16%] right-[16%] top-14 hidden border-t border-dashed border-line-strong md:block" />
        <ol className="relative grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="hc-reveal group hc-lift relative rounded-md border border-line bg-surface p-7">
              <div className="flex items-start justify-between">
                <span className="relative flex size-14 items-center justify-center rounded-md bg-ink text-gold-light shadow-[inset_0_0_0_1px_rgb(176_141_62/0.35)] transition-transform duration-500 group-hover:-rotate-6">
                  <step.icon className="size-6" aria-hidden />
                </span>
                <span className="text-5xl font-extrabold tabular-nums leading-none text-transparent [-webkit-text-stroke:1px_var(--line-strong)] transition-colors group-hover:[-webkit-text-stroke-color:var(--gold)]">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-6 text-h3 text-ink">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
        </div>
      </section>

      {/* ---------- Coming up + Today ---------- */}
      <section className="mx-auto max-w-6xl px-5 pt-24 sm:px-8 sm:pt-28">
        <div className="hc-reveal flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>What&apos;s happening</Eyebrow>
            <h2 className="mt-3 text-h1 text-ink">Coming up at Epe</h2>
          </div>
          <Link href="/events" className="group inline-flex items-center gap-1.5 font-semibold text-ink">
            <span className="hc-underline">All events</span> <ArrowUpRight className="hc-nudge size-4 text-accent" aria-hidden />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {events.length === 0 ? (
              <div className="hc-reveal relative flex h-full min-h-64 flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-line-strong bg-surface p-10 text-center">
                <div className="hc-dots-ink absolute inset-0" aria-hidden />
                <WheatSprig className="relative h-16" />
                <p className="relative mt-4 font-bold text-ink">New programmes are on the way</p>
                <p className="relative mt-1 max-w-sm text-sm text-muted">They&apos;ll be listed here as soon as they&apos;re announced.</p>
              </div>
            ) : (
              <ul className="grid gap-6 md:grid-cols-2">
                {events.slice(0, 2).map((e, i) => <EventCard key={e.id} event={e} featured={i === 0 && events.length === 1} />)}
              </ul>
            )}
          </div>

          {latest ? (
            <Link href="/today" className="hc-reveal group hc-lift relative isolate flex min-h-80 flex-col overflow-hidden rounded-md bg-night p-7 text-white">
              <div className="hc-dots absolute inset-0 -z-10 opacity-60" aria-hidden />
              <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-72 rounded-full" style={{ background: "radial-gradient(circle, rgb(176 141 62 / 0.4), transparent 65%)" }} />
              <WheatField className="absolute -bottom-6 -right-10 -z-10 h-40 opacity-40" />
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold-light">
                <BookOpen className="size-3.5" aria-hidden /> Today at Epe
              </p>
              <p className="mt-5 text-sm text-white/55">{latest.speaker_name ? `${latest.speaker_name} · ` : ""}{latest.scripture_reference ?? "Latest message"}</p>
              <p className="mt-2 text-2xl font-extrabold leading-tight tracking-[-0.02em]">{latest.title}</p>
              {latest.summary ? <p className="mt-3 line-clamp-3 text-white/65">{latest.summary}</p> : null}
              <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-gold-light">
                Read the takeaways <ArrowRight className="hc-nudge size-4" aria-hidden />
              </span>
            </Link>
          ) : (
            <div className="hc-reveal relative isolate flex min-h-80 flex-col justify-end overflow-hidden rounded-md bg-night p-7 text-white">
              <div className="hc-dots absolute inset-0 -z-10 opacity-60" aria-hidden />
              <SunRays className="absolute -right-32 -top-32 -z-10 size-96 opacity-80" />
              <BookOpen className="size-6 text-gold" aria-hidden />
              <p className="mt-4 text-xl font-extrabold tracking-[-0.02em]">Today at Epe</p>
              <p className="mt-2 text-white/60">This Sunday&apos;s message, photos and highlights will appear here after service.</p>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Benefits ---------- */}
      <section className="mx-auto max-w-6xl px-5 pt-24 sm:px-8 sm:pt-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div className="hc-reveal lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>Why register</Eyebrow>
            <h2 className="mt-3 text-h1 text-ink">Belong from your very first Sunday.</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Registering takes about two minutes and helps our pastors and teams know you, follow up, and make room for you.
            </p>
            <Ornament className="mt-8 text-accent" />
          </div>
          <ul className="grid gap-5 sm:grid-cols-2">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="hc-reveal group hc-lift rounded-md border border-line bg-surface p-6">
                <span className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent transition-colors duration-300 group-hover:bg-ink group-hover:text-gold-light">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-h3 text-ink">{title}</h3>
                <p className="mt-1.5 leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Closing call to action ---------- */}
      <section className="mx-auto max-w-6xl px-5 pt-24 sm:px-8 sm:pt-28">
        <div className="hc-reveal relative isolate overflow-hidden rounded-lg bg-night px-7 py-14 text-center text-white sm:px-14 sm:py-20">
          <div className="hc-dots absolute inset-0 -z-10 opacity-50" aria-hidden />
          <SunRays className="absolute left-1/2 top-1/2 -z-10 size-[900px] -translate-x-1/2 -translate-y-1/2 opacity-70" />
          <WheatField className="absolute -bottom-10 -left-8 -z-10 hidden h-56 opacity-50 sm:block" />
          <WheatField className="absolute -bottom-10 -right-8 -z-10 hidden h-56 -scale-x-100 opacity-50 sm:block" />
          <Ornament className="justify-center" />
          <h2 className="mx-auto mt-6 max-w-2xl text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-white sm:text-[2.75rem]">
            {user ? <>See you <span className="hc-gold-text">this Sunday.</span></> : <>Ready when <span className="hc-gold-text">you are.</span></>}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-white/60">
            {user ? "Your profile, attendance and everything happening at Epe, in one place." : "Register in about two minutes. Then a single scan is all it takes."}
          </p>
          <Link
            href={user ? "/me" : "/register"}
            className="group mt-9 inline-flex h-13 items-center justify-center gap-2 rounded-full bg-gold px-8 font-semibold text-night transition-colors hover:bg-gold-light"
          >
            {user ? "Go to my profile" : "Register now"} <ArrowRight className="hc-nudge size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
