import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarCheck2, CheckCircle2, Clock3, LogOut, MonitorPlay, Pencil, ScanLine, Smartphone, Sparkles, TrendingUp, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getSessionUser } from "@/lib/auth/session";
import { forgetDeviceAction, signOutAction, signOutEverywhereAction } from "@/lib/actions/auth";
import { AvatarUploader } from "@/components/me/avatar-uploader";
import { Badge } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { SunRays, WheatField } from "@/components/site/art";
import { delay } from "@/components/site/page-hero";
import { formatDate, formatTime } from "@/lib/time";
import { initials, isSyntheticEmail } from "@/lib/text";
import { MEMBERSHIP_STATUSES } from "@/lib/validation/member";

export const metadata: Metadata = { title: "My profile", robots: { index: false } };

export default async function MePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/me");
  const member = await getCurrentMember();
  if (!member) redirect("/register?next=/me");

  const supabase = await createClient();
  const yearStart = `${new Date().getFullYear()}-01-01T00:00:00Z`;
  const [history, total, thisYear, priv, avatar] = await Promise.all([
    supabase
      .from("attendance_report")
      .select("id, service_title, service_starts_at, checked_in_at, mode")
      .eq("member_id", member.id)
      .order("checked_in_at", { ascending: false })
      .limit(20),
    supabase.from("attendance").select("id", { count: "exact", head: true }).eq("member_id", member.id),
    supabase.from("attendance").select("id", { count: "exact", head: true }).eq("member_id", member.id).gte("checked_in_at", yearStart),
    supabase.from("member_private").select("emergency_contact_name, residential_address").eq("member_id", member.id).maybeSingle(),
    member.profile_photo_path ? supabase.storage.from("member-avatars").createSignedUrl(member.profile_photo_path, 3600) : Promise.resolve(null),
  ]);

  const rows = history.data ?? [];
  const checklist = [
    { label: "school or work", done: Boolean(member.occupation || member.school_name) },
    { label: "an emergency contact", done: Boolean(priv.data?.emergency_contact_name) },
    { label: "your address", done: Boolean(priv.data?.residential_address) },
    { label: "an email for signing in on new devices", done: Boolean(member.email && !isSyntheticEmail(member.email)) },
  ];
  const missing = checklist.filter((c) => !c.done).map((c) => c.label);
  // Name and phone are always present, so they count as the first two of six.
  const completion = Math.round(((2 + checklist.filter((c) => c.done).length) / 6) * 100);

  const statusLabel = MEMBERSHIP_STATUSES.find((s) => s.value === member.membership_status)?.label ?? member.membership_status;
  const displayName = `${member.preferred_name || member.first_name} ${member.last_name}`;

  const stats = [
    { icon: CalendarCheck2, label: "Services attended", value: total.count ?? 0 },
    { icon: TrendingUp, label: `In ${new Date().getFullYear()}`, value: thisYear.count ?? 0 },
    { icon: Clock3, label: "Last check-in", value: rows[0] ? formatDate(rows[0].checked_in_at) : "—" },
  ];

  return (
    <>
      {/* ---------- Profile header ---------- */}
      <section className="relative isolate overflow-hidden bg-night text-white">
        <div className="hc-dots absolute inset-0 -z-10 opacity-50" aria-hidden />
        <div aria-hidden className="hc-glow absolute -right-24 -top-48 -z-10 size-[560px] rounded-full" style={{ background: "radial-gradient(circle, rgb(176 141 62 / 0.3), transparent 62%)" }} />
        <SunRays className="absolute -right-56 -top-60 -z-10 size-[640px] opacity-60" />
        <WheatField className="absolute -bottom-10 right-0 -z-10 hidden h-52 opacity-50 md:block" />

        <div className="mx-auto max-w-5xl px-5 pb-28 pt-12 sm:px-8 sm:pt-16">
          {sp.welcome ? (
            <div className="hc-rise mb-10 flex items-start gap-3 rounded-md border border-gold/30 bg-white/[0.05] p-4 backdrop-blur">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold text-night">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <div role="status">
                <p className="font-bold text-white">You&apos;re registered. Welcome to Harvesters Epe!</p>
                <p className="mt-0.5 text-sm text-white/65">At the next service, scan the code at the entrance and you&apos;ll be checked in automatically.</p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="hc-rise space-y-6" style={delay(60)}>
              <div className="[&_button]:border-white/20 [&_button]:bg-white/[0.06] [&_button]:text-white [&_button:hover]:bg-white/[0.12] [&>div>span]:ring-2 [&>div>span]:ring-gold/60 [&>div>span]:ring-offset-4 [&>div>span]:ring-offset-night">
                <AvatarUploader userId={user.id} src={avatar?.data?.signedUrl ?? null} initials={initials(member.first_name, member.last_name)} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-light">My profile</p>
                <h1 className="mt-2 text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-white sm:text-[3rem]">{displayName}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full border border-white/15 bg-white/[0.05] px-2.5 py-0.5 font-mono text-xs tracking-wide text-white/75">{member.member_number}</span>
                  <Badge tone={member.membership_status === "member" ? "accent" : "outline"} className={member.membership_status === "member" ? "bg-gold text-night" : "border-white/20 text-white/70"}>
                    {statusLabel}
                  </Badge>
                </div>
              </div>
            </div>
            <Link
              href="/me/edit"
              className="hc-rise group inline-flex h-11 items-center gap-2 rounded-full bg-gold px-5 text-sm font-semibold text-night transition-colors hover:bg-gold-light"
              style={delay(140)}
            >
              <Pencil className="size-4" aria-hidden /> Edit profile
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-8 px-5 sm:px-8">
        {/* ---------- Stats ---------- */}
        <div className="relative -mt-16 grid gap-4 sm:grid-cols-3">
          {stats.map((s, i) => (
            <div key={s.label} className="hc-rise hc-lift group rounded-md border border-line bg-surface p-5 shadow-soft" style={delay(200 + i * 80)}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-muted">{s.label}</p>
                <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent transition-colors group-hover:bg-ink group-hover:text-gold-light">
                  <s.icon className="size-4" aria-hidden />
                </span>
              </div>
              <p className="mt-3 text-[2rem] font-extrabold leading-none tabular-nums tracking-[-0.02em] text-ink">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ---------- Profile completion ---------- */}
        {missing.length > 0 ? (
          <div className="hc-reveal flex flex-col gap-5 rounded-md border border-line bg-surface p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="relative size-16 shrink-0" aria-hidden>
              <svg viewBox="0 0 36 36" className="size-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--fill)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(completion / 100) * 97.4} 97.4`} className="transition-[stroke-dasharray] duration-700" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold tabular-nums text-ink">{completion}%</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">Finish your profile when you have a minute</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">You can add {missing.join(", ").replace(/, ([^,]*)$/, " and $1")}.</p>
            </div>
            <Button asChild variant="secondary" className="group rounded-full">
              <Link href="/me/edit">Add details <ArrowRight className="hc-nudge" aria-hidden /></Link>
            </Button>
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          {/* ---------- Attendance timeline ---------- */}
          <section className="hc-reveal rounded-md border border-line bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
              <div>
                <h2 className="text-h3 font-bold text-ink">Attendance history</h2>
                <p className="mt-0.5 text-sm text-muted">Your most recent 20 check-ins.</p>
              </div>
              <CalendarCheck2 className="size-5 text-accent" aria-hidden />
            </div>
            {rows.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <span className="relative flex size-14 items-center justify-center rounded-full bg-ink text-gold-light">
                  <span className="hc-pulse-ring absolute inset-0 rounded-full border border-gold" aria-hidden />
                  <ScanLine className="size-6" aria-hidden />
                </span>
                <p className="mt-5 font-bold text-ink">No check-ins yet</p>
                <p className="mt-1 max-w-xs text-sm text-muted">Scan the code at the entrance at your next service and it will show up here.</p>
              </div>
            ) : (
              <ol className="relative px-6 py-4">
                <span aria-hidden className="absolute bottom-8 left-[38px] top-8 w-px bg-line" />
                {rows.map((r, i) => (
                  <li key={r.id} className="relative flex items-center gap-4 py-3">
                    <span className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 ${i === 0 ? "border-accent bg-accent text-white" : "border-line-strong bg-surface text-subtle"}`}>
                      {r.mode === "online" ? <MonitorPlay className="size-3" aria-hidden /> : <CheckCircle2 className="size-3.5" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{r.service_title}</p>
                      <p className="text-sm text-muted">{formatDate(r.service_starts_at)}</p>
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      <p className="font-semibold tabular-nums text-ink">{formatTime(r.checked_in_at)}</p>
                      <p className="text-xs text-subtle">{r.mode === "online" ? "Online" : "In person"}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* ---------- This device ---------- */}
          <section className="hc-reveal relative isolate self-start overflow-hidden rounded-md bg-night p-6 text-white">
            <div className="hc-dots absolute inset-0 -z-10 opacity-50" aria-hidden />
            <div aria-hidden className="absolute -right-20 -top-20 -z-10 size-56 rounded-full" style={{ background: "radial-gradient(circle, rgb(176 141 62 / 0.3), transparent 65%)" }} />
            <span className="flex size-11 items-center justify-center rounded-full border border-gold/30 bg-white/[0.05] text-gold-light">
              <Smartphone className="size-5" aria-hidden />
            </span>
            <h2 className="mt-5 text-h3 font-bold text-white">This device</h2>
            <p className="mt-1 text-sm leading-relaxed text-white/60">You stay signed in here for up to 12 months so check-in is one scan.</p>
            <div className="mt-6 flex flex-col gap-2">
              <form action={signOutAction}>
                <Button type="submit" className="w-full rounded-full bg-white text-ink hover:bg-white/90"><LogOut aria-hidden /> Sign out</Button>
              </form>
              <form action={forgetDeviceAction}>
                <input type="hidden" name="next" value="/sign-in" />
                <Button type="submit" variant="ghost" className="w-full rounded-full border border-white/15 text-white hover:bg-white/[0.08]">
                  <UserRound aria-hidden /> Not me — forget this device
                </Button>
              </form>
              <form action={signOutEverywhereAction}>
                <Button type="submit" variant="ghost" className="w-full rounded-full text-white/60 hover:bg-white/[0.06] hover:text-white">Sign out on all devices</Button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
