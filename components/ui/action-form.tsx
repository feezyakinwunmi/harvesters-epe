"use client";
import * as React from "react";
import { createContext, startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions/result";
import { FormMessage } from "@/components/ui/form-controls";

/** Lets <SubmitButton> show a pending state inside <ActionForm>. */
export const ActionPendingContext = createContext(false);

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: (state: ActionState, pending: boolean) => React.ReactNode;
  className?: string;
  /** Toast on success (and hide the inline success message). */
  toastOnSuccess?: boolean;
  resetOnSuccess?: boolean;
  onSuccess?: (state: ActionState) => void;
};

/**
 * A form bound to a server action. Submits via onSubmit (not the `action`
 * prop) so React does not clear what the person typed when validation fails.
 */
export function ActionForm({ action, children, className, toastOnSuccess = true, resetOnSuccess = false, onSuccess }: Props) {
  const [state, dispatch, pending] = useActionState(action, { ok: false } as ActionState);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<ActionState | null>(null);

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state;
      if (toastOnSuccess && state.message) toast.success(state.message);
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.(state);
      router.refresh();
    }
  }, [state, toastOnSuccess, resetOnSuccess, onSuccess, router]);

  return (
    <ActionPendingContext.Provider value={pending}>
      <form
        ref={formRef}
        className={className}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          // Include the clicked button's name/value (e.g. intent=publish).
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (submitter?.name) data.set(submitter.name, submitter.value);
          startTransition(() => dispatch(data));
        }}
      >
        {!state.ok || !toastOnSuccess ? <FormMessage state={state} /> : null}
        {children(state, pending)}
      </form>
    </ActionPendingContext.Provider>
  );
}
