"use client";
import { useActionState, useEffect, useRef } from "react";
import { KeyRound, MailCheck } from "lucide-react";
import { Field, FormMessage, Input } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { redeemUsherCode, verifySignInCode } from "@/lib/actions/auth";
import type { ActionState } from "@/lib/actions/result";

/** Enter the one-time code that was emailed / texted. */
export function VerifyCodeForm({
  channel,
  target,
  destination,
  next,
  onBack,
}: {
  channel: "email" | "phone" | "device";
  target: string;
  destination: string;
  next: string;
  onBack?: () => void;
}) {
  const [state, action] = useActionState(verifySignInCode, { ok: false } as ActionState);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <form action={action} className="hc-step-in space-y-4" noValidate>
      <span className="relative flex size-14 items-center justify-center rounded-full bg-ink text-gold-light">
        <span className="hc-pulse-ring absolute inset-0 rounded-full border border-gold" aria-hidden />
        <MailCheck className="size-6" aria-hidden />
      </span>
      <h2 className="pt-2 text-h2 text-ink">Check your {channel === "phone" ? "messages" : "inbox"}</h2>
      <p className="text-[15px] text-muted">
        We sent a code to <span className="font-semibold text-ink">{destination}</span>. It expires in a few minutes.
      </p>
      <input type="hidden" name="channel" value={channel} />
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <Field id="otp-code" label="Code" error={state.fieldErrors?.code}>
        <Input
          ref={ref}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={10}
          className="h-12 text-center text-xl font-bold tracking-[0.3em] tabular-nums"
          required
        />
      </Field>
      <SubmitButton className="h-12 w-full rounded-full text-base" pendingLabel="Checking…">
        Confirm and continue
      </SubmitButton>
      {onBack ? (
        <button type="button" onClick={onBack} className="w-full text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
          Didn&apos;t get it? Go back and try again
        </button>
      ) : null}
    </form>
  );
}

/** Enter an 8-character code an usher issued after checking ID in person. */
export function UsherCodeForm({ next }: { next: string }) {
  const [state, action] = useActionState(redeemUsherCode, { ok: false } as ActionState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="flex gap-3 rounded-md bg-accent-soft p-4">
        <KeyRound className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <p className="text-sm leading-relaxed text-text">
        At the welcome desk, an usher can confirm who you are and give you a one-time code. It works once and expires after 15 minutes.
        </p>
      </div>
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <Field id="usher-code" label="Code from the usher" error={state.fieldErrors?.code}>
        <Input
          name="code"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="ABCD-2345"
          maxLength={11}
          className="h-12 text-center text-lg font-bold uppercase tracking-[0.2em]"
          required
        />
      </Field>
      <SubmitButton className="h-12 w-full rounded-full text-base" pendingLabel="Checking…">
        Sign in with code
      </SubmitButton>
    </form>
  );
}
