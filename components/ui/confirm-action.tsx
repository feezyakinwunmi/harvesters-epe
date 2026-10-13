"use client";
import * as React from "react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import type { ActionState } from "@/lib/actions/result";

type Props = {
  /** Server action receiving the form data (hidden fields + reason/confirm). */
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  hidden?: Record<string, string>;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  successMessage?: string;
  trigger: React.ReactNode;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  destructive?: boolean;
  /** Require typing this exact word (e.g. "DELETE") before the button enables. */
  requireTyped?: string;
  /** Ask for a reason (stored in the audit log). */
  reason?: { label: string; placeholder?: string; required?: boolean };
};

/**
 * Confirmation dialog for destructive or sensitive actions. The server action
 * re-validates everything (including the typed DELETE); this is UX only.
 */
export function ConfirmAction({
  action,
  hidden,
  title,
  description,
  confirmLabel,
  successMessage,
  trigger,
  triggerVariant = "secondary",
  triggerSize = "sm",
  destructive = false,
  requireTyped,
  reason,
}: Props) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, { ok: false } as ActionState);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? successMessage ?? "Done");
      setOpen(false);
      setTyped("");
      router.refresh();
    }
  }, [state, successMessage, router]);

  const typedOk = !requireTyped || typed === requireTyped;

  return (
    <AlertDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setTyped(""); }}>
      <AlertDialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>
          {trigger}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent title={title} description={description}>
        <form action={formAction} className="space-y-4">
          {hidden ? Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />) : null}
          {reason ? (
            <Field id="confirm-reason" label={reason.label} optional={!reason.required}>
              <Textarea name="reason" rows={3} placeholder={reason.placeholder} required={reason.required} minLength={reason.required ? 3 : undefined} maxLength={500} />
            </Field>
          ) : null}
          {requireTyped ? (
            <Field id="confirm-typed" label={`Type ${requireTyped} to confirm`}>
              <Input name="confirm" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} spellCheck={false} />
            </Field>
          ) : null}
          {!state.ok && state.message ? (
            <p role="alert" className="rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">
              {state.message}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <AlertDialogCancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialogCancel>
            <Button type="submit" variant={destructive ? "danger" : "primary"} disabled={!typedOk || pending}>
              {pending ? "Working…" : confirmLabel}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
