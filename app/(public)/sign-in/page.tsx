import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, KeyRound, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { getCurrentMember, getSessionUser } from "@/lib/auth/session";
import { readRememberedDevice } from "@/lib/auth/device";
import { publicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/text";
import { SignInFlow } from "@/components/auth/sign-in-flow";
import { AuthShell } from "@/components/auth/auth-shell";
import { forgetDeviceAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next, "/me");
  const [user, member, device] = await Promise.all([getSessionUser(), getCurrentMember(), readRememberedDevice()]);

  return (
    <AuthShell
      eyebrow="Sign in"
      title={<>Good to see you <span className="hc-gold-text">again.</span></>}
      intro="Confirm it's you with a one-time code. This device will then remember you, so checking in is a single scan."
      points={[
        { icon: <KeyRound aria-hidden />, title: "No password to remember", body: "We send a short code to your email, or an usher can give you one." },
        { icon: <Smartphone aria-hidden />, title: "Remembered for 12 months", body: "Sign in once on your phone and you're set for the year." },
        { icon: <ShieldCheck aria-hidden />, title: "Your details stay private", body: "Only authorised church staff can see your record." },
      ]}
    >
      {user ? (
        <div>
          <span className="flex size-14 items-center justify-center rounded-full bg-ink text-gold-light">
            <UserRound className="size-6" aria-hidden />
          </span>
          <h2 className="mt-6 text-h1 text-ink">You&apos;re signed in</h2>
          <p className="mt-3 text-muted">
            Signed in{member ? <> as <span className="font-semibold text-ink">{member.preferred_name || member.first_name} {member.last_name}</span></> : null}.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={next} className="group inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 font-semibold text-white hover:bg-night-raised">
              Continue <ArrowRight className="hc-nudge size-4 text-gold-light" aria-hidden />
            </Link>
            <form action={forgetDeviceAction} className="flex-1">
              <input type="hidden" name="next" value={next} />
              <Button type="submit" variant="secondary" className="h-12 w-full rounded-full">Not you? Switch account</Button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <h2 className="text-h2 text-ink">Welcome back</h2>
          <p className="mt-2 text-muted">Choose how you&apos;d like to get your code.</p>
          <div className="mt-8">
            <SignInFlow next={next} smsEnabled={publicEnv.smsOtpEnabled} remembered={device ? { name: device.name, hint: device.hint } : null} />
          </div>
        </>
      )}
    </AuthShell>
  );
}
