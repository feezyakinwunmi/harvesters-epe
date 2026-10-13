"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Mail, MessageSquareText, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { UsherCodeForm, VerifyCodeForm } from "@/components/auth/code-forms";
import { forgetDeviceAction, sendDeviceCode, sendSignInCode, type CodeStepState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

type Method = "email" | "phone" | "usher";

export function SignInFlow({
  next,
  smsEnabled,
  remembered,
}: {
  next: string;
  smsEnabled: boolean;
  remembered: { name: string; hint: string | null } | null;
}) {
  const [method, setMethod] = useState<Method>("email");
  const [codeState, sendCode] = useActionState(sendSignInCode, { ok: false } as CodeStepState);
  const [deviceState, sendForDevice, sendingDevice] = useActionState(sendDeviceCode, { ok: false } as CodeStepState);
  const [stage, setStage] = useState<"start" | "code">("start");

  const sent = stage === "code" ? (deviceState.ok && deviceState.data ? deviceState : codeState.ok && codeState.data ? codeState : null) : null;

  if (sent?.data) {
    return (
      <VerifyCodeForm
        channel={sent.data.channel}
        target={sent.data.target}
        destination={sent.data.destination}
        next={next}
        onBack={() => setStage("start")}
      />
    );
  }

  const methods: Array<{ key: Method; label: string; icon: React.ReactNode }> = [
    { key: "email", label: "Email", icon: <Mail aria-hidden /> },
    ...(smsEnabled ? [{ key: "phone" as const, label: "Text message", icon: <MessageSquareText aria-hidden /> }] : []),
    { key: "usher", label: "Usher code", icon: <KeyRound aria-hidden /> },
  ];

  return (
    <div className="space-y-8">
      {remembered ? (
        <div className="relative overflow-hidden rounded-md border border-line bg-canvas p-5">
          <div className="hc-dots-ink absolute inset-0" aria-hidden />
          <div className="relative flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink text-base font-bold text-gold-light">
              {remembered.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">This device remembers</p>
              <p className="truncate text-lg font-bold text-ink">{remembered.name}</p>
            </div>
          </div>
          <div className="relative">
          <FormMessage state={deviceState} />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <form action={(fd) => { setStage("code"); sendForDevice(fd); }} className="sm:flex-1">
              <Button type="submit" className="h-11 w-full rounded-full" disabled={sendingDevice || !remembered.hint}>
                {sendingDevice ? "Sending…" : `Continue as ${remembered.name.split(" ")[0]}`}
              </Button>
            </form>
            <form action={forgetDeviceAction}>
              <input type="hidden" name="next" value={next} />
              <Button type="submit" variant="secondary" className="h-11 w-full rounded-full">Use another account</Button>
            </form>
          </div>
          {!remembered.hint ? (
            <p className="mt-3 text-xs text-muted">There&apos;s no email on this account. Use an usher code below.</p>
          ) : null}
          </div>
        </div>
      ) : null}

      <div>
        <div role="tablist" aria-label="Sign-in method" className="grid grid-flow-col gap-1 rounded-full border border-line bg-fill p-1">
          {methods.map((m) => (
            <button
              key={m.key}
              role="tab"
              type="button"
              aria-selected={method === m.key}
              onClick={() => setMethod(m.key)}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-300 [&_svg]:size-4",
                method === m.key ? "bg-ink text-white shadow-soft [&_svg]:text-gold-light" : "text-muted hover:text-ink",
              )}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" key={method} className="hc-step-in pt-6">
          {method === "usher" ? (
            <UsherCodeForm next={next} />
          ) : (
            <form action={(fd) => { setStage("code"); sendCode(fd); }} className="space-y-4" noValidate>
              <input type="hidden" name="channel" value={method} />
              {!deviceState.ok ? <FormMessage state={codeState} /> : null}
              {method === "email" ? (
                <Field id="signin-email" label="Email address" error={codeState.fieldErrors?.email} hint="We'll email you a one-time code. No password needed.">
                  <Input name="email" type="email" autoComplete="email" inputMode="email" required />
                </Field>
              ) : (
                <Field id="signin-phone" label="Phone number" error={codeState.fieldErrors?.phone} hint="We'll text you a one-time code.">
                  <Input name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="0803 123 4567" required />
                </Field>
              )}
              <SubmitButton className="h-12 w-full rounded-full text-base" pendingLabel="Sending code…">
                Send me a code
              </SubmitButton>
            </form>
          )}
        </div>
      </div>

      <p className="text-center text-sm text-muted">
        New to Harvesters Epe?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-ink underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
          Register in a minute
        </Link>
      </p>
    </div>
  );
}
