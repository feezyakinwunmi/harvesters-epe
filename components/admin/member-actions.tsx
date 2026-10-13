"use client";
import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { issueRecoveryCode } from "@/lib/actions/members-admin";
import type { ActionState } from "@/lib/actions/result";
import { formatTime } from "@/lib/time";

/** Usher desk: check ID in person, then read this code to the member. */
export function RecoveryCodeButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [state, action, pending] = useActionState(issueRecoveryCode, { ok: false } as ActionState<{ code: string; expiresAt: string }>);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm"><KeyRound aria-hidden /> Sign-in code</Button>
      </DialogTrigger>
      <DialogContent
        title="In-person sign-in code"
        description={`Only issue this after confirming you're speaking to ${memberName} in person. The code works once and expires in 15 minutes.`}
      >
        {state.ok && state.data ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted">Read this to {memberName}. They enter it under &ldquo;I have a code from an usher&rdquo;.</p>
            <p className="select-all rounded-md bg-ink py-5 font-mono text-4xl font-bold tracking-[0.18em] text-white" aria-live="polite">{state.data.code}</p>
            <p className="text-sm text-muted">Expires at {formatTime(state.data.expiresAt)}. Issuing a new code cancels this one.</p>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <input type="hidden" name="member_id" value={memberId} />
            {state.message ? <p role="alert" className="rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">{state.message}</p> : null}
            <Button type="submit" className="w-full" disabled={pending}>{pending ? "Generating…" : "I've confirmed who they are — show code"}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
