import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, MapPin, MonitorPlay, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { readRememberedDevice } from "@/lib/auth/device";
import { checkInCopy, needsIdentity, parseCheckInResult } from "@/lib/checkin/status";
import { looksLikeToken } from "@/lib/qr/token";
import { formatLongDate, formatTime } from "@/lib/time";
import { getSettings } from "@/lib/settings";
import { publicEnv } from "@/lib/env";
import { Wordmark } from "@/components/site/wordmark";
import { CheckMark } from "@/components/checkin/check-mark";
import { IdentityGate } from "@/components/checkin/identity-gate";
import { Badge } from "@/components/ui/display";
import { SunRays, WheatField } from "@/components/site/art";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Check in", robots: { index: false, follow: false } };

// Scanning the service QR lands here. The database function decides
// everything (token, window, identity, duplicates); this page only renders.
export default async function CheckInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let result = parseCheckInResult(null);
  if (looksLikeToken(token)) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("check_in", { p_token: token });
    if (error) console.error("[check-in] rpc error", error.code);
    result = parseCheckInResult(error ? null : data);
  }

  const copy = checkInCopy(result);
  const [device, settings] = await Promise.all([needsIdentity(result.status) ? readRememberedDevice() : null, getSettings()]);
  const success = result.status === "checked_in" || result.status === "already_checked_in";
  const here = `/c/${token}`;
  const online = result.mode === "online";

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-canvas">
      <div className="hc-dots-ink absolute inset-x-0 top-0 -z-10 h-96 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />
      {success ? (
        <SunRays className="absolute left-1/2 top-[-180px] -z-10 size-[620px] -translate-x-1/2 opacity-60" />
      ) : null}
      <WheatField className="absolute -bottom-8 -right-10 -z-10 h-48 opacity-25" />
      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-5 pt-6">
        <Wordmark />
        {online ? <Badge tone="accent"><MonitorPlay className="size-3" aria-hidden /> Online</Badge> : null}
      </header>

      <main id="main" className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-10 pt-10">
        <section aria-live="polite" className={cn("hc-rise", success ? "pt-10" : "")}>
          {success ? <CheckMark /> : null}
          <h1 className={cn("font-extrabold tracking-[-0.03em] text-ink", success ? "mt-8 text-[2.6rem] leading-[1.05]" : "text-[2rem] leading-tight")}>
            {copy.title}
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-muted">{copy.body}</p>
        </section>

        {result.serviceTitle ? (
          <dl className="hc-rise mt-8 space-y-4 rounded-md border border-line bg-surface p-5 text-[15px] shadow-soft" style={{ ["--d" as string]: "200ms" }}>
            <div className="flex items-start gap-3">
              <dt className="sr-only">Service</dt>
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <dd>
                <span className="font-bold text-ink">{result.serviceTitle}</span>
                {result.serviceStartsAt ? (
                  <span className="block text-muted">
                    {formatLongDate(result.serviceStartsAt)} · {formatTime(result.serviceStartsAt)}
                    {result.serviceEndsAt ? `–${formatTime(result.serviceEndsAt)}` : ""}
                  </span>
                ) : null}
              </dd>
            </div>
            {result.location && !online ? (
              <div className="flex items-start gap-3">
                <dt className="sr-only">Location</dt>
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <dd className="text-text">{result.location}</dd>
              </div>
            ) : null}
            {success && result.checkedInAt ? (
              <div className="flex items-start gap-3">
                <dt className="sr-only">Checked in</dt>
                <UserRound className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <dd className="text-text">
                  Checked in at <span className="font-semibold tabular-nums text-ink">{formatTime(result.checkedInAt)}</span>
                  {result.recordedMode ? <span className="text-muted"> · {result.recordedMode === "online" ? "online" : "in person"}</span> : null}
                </dd>
              </div>
            ) : null}
            {result.status === "not_open" && result.sessionStartsAt ? (
              <div className="text-sm text-muted">Check-in opens at {formatTime(result.sessionStartsAt)}.</div>
            ) : null}
          </dl>
        ) : null}

        {needsIdentity(result.status) ? (
          <div className="mt-8">
            <IdentityGate
              next={here}
              status={result.status}
              remembered={device ? { name: device.name, hint: device.hint } : null}
              smsEnabled={publicEnv.smsOtpEnabled}
            />
          </div>
        ) : null}

        {success ? (
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/today" className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-ink px-5 font-semibold text-white hover:bg-night-raised">
              See today at Epe
            </Link>
            <Link href="/me" className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-line-strong bg-surface px-5 font-semibold text-ink hover:bg-fill">
              My attendance
            </Link>
          </div>
        ) : null}

        {["closed", "unavailable", "mode_not_allowed", "invalid", "not_open"].includes(result.status) ? (
          <div className="mt-8 rounded-md border border-line bg-surface p-5 text-sm leading-relaxed text-muted">
            <p className="font-bold text-ink">Need a hand?</p>
            <p className="mt-1">
              Ushers at the welcome desk can record your attendance for you.
              {settings.church.support_contact ? <> You can also reach the team on <span className="font-semibold text-ink">{settings.church.support_contact}</span>.</> : null}
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
