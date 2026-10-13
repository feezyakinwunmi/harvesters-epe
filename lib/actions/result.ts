import type { ZodError } from "zod";

export type ActionState<T = unknown> = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
};

export const initialActionState: ActionState = { ok: false };

export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function invalid(error: ZodError, message = "Please check the highlighted fields."): ActionState<never> {
  return { ok: false, message, fieldErrors: fieldErrorsFrom(error) };
}

/**
 * Turns a database / Supabase error into a message safe to show. Known
 * messages raised by our own SQL functions are passed through; anything else
 * becomes a generic message and is logged server-side without user data.
 */
export function friendlyDbError(error: { message?: string; code?: string } | null | undefined, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  const code = error.code ?? "";
  const msg = error.message ?? "";
  if (code === "42501") {
    return /not authorised|permission denied|row-level security/i.test(msg)
      ? "You don't have permission to do that."
      : msg;
  }
  // Our own RAISE EXCEPTION messages use these codes and are written for people.
  if (["P0001", "P0002", "22001", "22007", "22023", "22P02", "23502", "23514"].includes(code)) return msg;
  if (code === "23505") return "That already exists.";
  console.error("[db]", code, msg.slice(0, 200));
  return fallback;
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof Error && error.name === "NotAuthorisedError") return error.message;
  console.error("[action]", error instanceof Error ? error.message : error);
  return fallback;
}
