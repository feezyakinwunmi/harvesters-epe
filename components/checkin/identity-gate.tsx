"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { ChevronDown, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-controls";
import { UsherCodeForm, VerifyCodeForm } from "@/components/auth/code-forms";
import { forgetDeviceAction, sendDeviceCode, type CodeStepState } from "@/lib/actions/auth";
import type { CheckInStatus } from "@/lib/checkin/status";

type Props = {
  next: string;
  status: CheckInStatus;
  remembered: { name: string; hint: string | null } | null;
  smsEnabled: boolean;
};

/**
 * Shown on the check-in page when we can't identify the person yet.
 * A valid session never reaches this component — the database checks
 * the person in straight away.
 */
export function IdentityGate({ next, status, remembered }: Props) {
  const [deviceState, sendCode, sending] = useActionState(sendDeviceCode, { ok: false } as CodeStepState);
  const [resetKey, setResetKey] = useState(0);
  const [showUsher, setShowUsher] = useState(false);
  const enc = encodeURIComponent(next);

  if (status === "needs_registration") {
    return (
      <div className="space-y-3">
        <Link href={`/register?next=${enc}`} className="flex h-12 w-full items-center justify-center rounded-sm bg-ink font-semibold text-white hover:bg-neutral-800">
          Add my details
        </Link>
        <p className="text-center text-sm text-muted">Name and phone number are enough for today.</p>
      </div>
    );
  }

  const codeSent = deviceState.ok && deviceState.data && resetKey === 0;

  // Signed in, but the session is too old or was revoked, and this device
  // doesn't remember who it is: sign out here and confirm with a code.
  if (status === "reauth_required" && !remembered) {
    return (
      <form action={forgetDeviceAction} className="space-y-3">
        <input type="hidden" name="next" value={`/sign-in?next=${enc}`} />
        <Button type="submit" className="h-12 w-full text-base">Confirm it&apos;s me</Button>
        <p className="text-center text-sm text-muted">We&apos;ll send a one-time code, then check you in.</p>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      {remembered ? (
        codeSent && deviceState.data ? (
          <VerifyCodeForm channel="device" target="" destination={deviceState.data.destination} next={next} onBack={() => setResetKey((k) => k + 1)} />
        ) : (
          <div className="space-y-3">
            <FormMessage state={deviceState} />
            <form action={(fd) => { setResetKey(0); sendCode(fd); }}>
              <Button type="submit" className="h-12 w-full text-base" disabled={sending}>
                {sending ? "Sending code…" : `Continue as ${remembered.name}`}
              </Button>
            </form>
            {remembered.hint ? <p className="text-center text-sm text-muted">We&apos;ll send a code to {remembered.hint}.</p> : null}
            <form action={forgetDeviceAction} className="text-center">
              <input type="hidden" name="next" value={next} />
              <button type="submit" className="text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                Not {remembered.name.split(" ")[0]}? Use another account
              </button>
            </form>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <Link href={`/register?next=${enc}`} className="flex h-12 w-full items-center justify-center rounded-sm bg-ink text-base font-semibold text-white hover:bg-neutral-800">
            First time here? Register
          </Link>
          <Link href={`/sign-in?next=${enc}`} className="flex h-12 w-full items-center justify-center rounded-sm border border-line-strong bg-surface text-base font-semibold text-ink hover:bg-fill">
            I&apos;ve been here before
          </Link>
        </div>
      )}

      <div className="border-t border-line pt-4">
        <button
          type="button"
          aria-expanded={showUsher}
          onClick={() => setShowUsher((s) => !s)}
          className="flex w-full items-center justify-between py-1 text-sm font-semibold text-ink"
        >
          <span className="inline-flex items-center gap-2"><KeyRound className="size-4 text-muted" aria-hidden /> I have a code from an usher</span>
          <ChevronDown className={`size-4 text-muted transition-transform ${showUsher ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {showUsher ? <div className="pt-4"><UsherCodeForm next={next} /></div> : null}
      </div>
    </div>
  );
}
