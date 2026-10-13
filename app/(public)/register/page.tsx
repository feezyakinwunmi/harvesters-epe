import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { getCurrentMember, getSessionUser } from "@/lib/auth/session";
import { safeNextPath, isSyntheticEmail } from "@/lib/text";
import { RegistrationWizard } from "@/components/register/registration-wizard";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next, "/me?welcome=1");
  const [user, member] = await Promise.all([getSessionUser(), getCurrentMember()]);
  if (member) redirect(next);

  const checkingIn = next.startsWith("/c/");

  return (
    <AuthShell
      wide
      eyebrow={checkingIn ? "Check in" : "Register"}
      title={checkingIn ? <>Welcome! Let&apos;s <span className="hc-gold-text">check you in.</span></> : <>Join the family at <span className="hc-gold-text">Epe.</span></>}
      intro="Four short steps. Only your name and phone number are required today. You can add school, work and emergency contact details later from your profile."
      points={[
        { icon: <KeyRound aria-hidden />, title: "No password to create", body: "You'll sign in with a one-time code whenever you need to." },
        { icon: <Smartphone aria-hidden />, title: "One scan from now on", body: "This phone stays signed in for up to 12 months." },
        { icon: <ShieldCheck aria-hidden />, title: "Private by design", body: "Only authorised church staff can see your details." },
      ]}
      footnote={
        !user ? (
          <p className="text-center text-sm text-muted">
            Registered before?{" "}
            <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="font-semibold text-ink underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
              Sign in instead
            </Link>
          </p>
        ) : null
      }
    >
      <RegistrationWizard next={next} prefill={user?.email && !isSyntheticEmail(user.email) ? { email: user.email } : undefined} />
    </AuthShell>
  );
}
