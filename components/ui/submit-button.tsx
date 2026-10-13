"use client";
import { useContext } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ActionPendingContext } from "@/components/ui/action-form";

export function SubmitButton({ children, pendingLabel, ...props }: ButtonProps & { pendingLabel?: string }) {
  const { pending: formPending } = useFormStatus();
  const ctxPending = useContext(ActionPendingContext);
  const pending = formPending || ctxPending;
  return (
    <Button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending}>
      {pending ? (pendingLabel ?? "Saving…") : children}
    </Button>
  );
}
