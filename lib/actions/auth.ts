"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { forgetDevice, readRememberedDevice, rememberDevice } from "@/lib/auth/device";
import { friendlyDbError, invalid, type ActionState } from "@/lib/actions/result";
import { registrationSchema } from "@/lib/validation/member";
import { hashRecoveryCode, isWellFormedRecoveryCode } from "@/lib/qr/token";
import { isSyntheticEmail, normalizePhone, safeNextPath, syntheticEmailFor } from "@/lib/text";
import { publicEnv } from "@/lib/env";

// ───────────────────────────────────────────────────────────────────
// Authentication model (see README → "Sign-in and the 12-month device")
//
// * Nobody invents a password. At registration the server creates a
//   Supabase Auth user with a random 256-bit password that is used once to
//   open a session and then discarded. Members without an email get an
//   undeliverable internal address (…@no-email.harvesters-epe.invalid).
// * Returning on a new device / after expiry: a one-time code to their
//   email (Supabase OTP), an SMS code when an SMS provider is configured,
//   or an 8-character code an usher issues after checking them in person.
//   The in-person code rotates the random password server-side and opens a
//   new session — the password itself never leaves the server.
// * Sessions persist for up to 12 months (cookie maxAge + DB age check).
// ───────────────────────────────────────────────────────────────────

function randomPassword(): string {
  return randomBytes(32).toString("base64url");
}

function isEmailTaken(error: { code?: string; message?: string; status?: number } | null): boolean {
  if (!error) return false;
  return error.code === "email_exists" || error.code === "user_already_exists" || /already (been )?registered|already exists/i.test(error.message ?? "");
}

// ── Registration ──────────────────────────────────────────────────

export type RegisterResult = ActionState<{ redirectTo?: string; existing?: "email" | "possible_duplicate" }>;

export async function registerMember(input: unknown): Promise<RegisterResult> {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  // Bots fill every field, including the hidden one.
  if (v.website) return { ok: true, data: { redirectTo: "/" } };

  const next = safeNextPath(v.next, "/me?welcome=1");
  const phone = normalizePhone(v.phone);
  if (!phone) return { ok: false, message: "Please check the phone number.", fieldErrors: { phone: "Use a valid number, e.g. 0803 123 4567" } };
  const email = v.email ? v.email.toLowerCase() : null;

  const profile = {
    first_name: v.first_name,
    last_name: v.last_name,
    preferred_name: v.preferred_name ?? "",
    gender: v.gender ?? "",
    marital_status: v.marital_status ?? "",
    phone,
    whatsapp_number: v.whatsapp_number ? (normalizePhone(v.whatsapp_number) ?? "") : phone,
    email: email ?? "",
    city: v.city ?? "",
    state: v.state ?? "",
    heard_about_church: v.heard_about_church ?? "",
    usual_service: v.usual_service ?? "",
    previous_church: v.previous_church ?? "",
    interested_in_serving: v.interested_in_serving,
    is_student: v.is_student,
    school_name: v.is_student ? (v.school_name ?? "") : "",
    consent_to_contact: v.consent_to_contact,
    photo_consent: v.photo_consent,
  };
  const privateDetails = { date_of_birth: v.date_of_birth ?? "" };

  const supabase = await createClient();
  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();

  // Already signed in (e.g. an admin, or an account without a profile yet).
  if (existingUser) {
    const { error } = await supabase.rpc("register_self", { p_profile: profile, p_private: privateDetails });
    if (error) return { ok: false, message: friendlyDbError(error) };
    await rememberDevice({ uid: existingUser.id, firstName: v.first_name, lastName: v.last_name, email: existingUser.email });
    return { ok: true, data: { redirectTo: next } };
  }

  const admin = createAdminClient();

  // People without an email: warn about a likely duplicate (same phone and
  // same name) so they recover the existing record instead of making a new one.
  if (!email && !v.not_duplicate) {
    const { data: dupes } = await admin
      .from("members")
      .select("id")
      .eq("phone", phone)
      .ilike("first_name", v.first_name)
      .ilike("last_name", v.last_name)
      .is("deleted_at", null)
      .limit(1);
    if (dupes && dupes.length > 0) {
      return {
        ok: false,
        message: "It looks like you've registered before with this name and phone number.",
        data: { existing: "possible_duplicate" },
      };
    }
  }

  const authEmail = email ?? syntheticEmailFor(randomUUID());
  const password = randomPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { first_name: v.first_name },
  });

  if (createError || !created.user) {
    if (isEmailTaken(createError)) {
      return {
        ok: false,
        message: "An account already uses this email. Sign in with a one-time code instead.",
        data: { existing: "email" },
      };
    }
    console.error("[register] createUser failed", createError?.code);
    return { ok: false, message: "We couldn't create your account just now. Please try again or ask an usher." };
  }

  const uid = created.user.id;
  const rollback = async () => {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    await admin.auth.admin.deleteUser(uid).catch(() => undefined);
  };

  if (publicEnv.smsOtpEnabled) {
    // Best effort: lets this person use SMS codes later. Shared family phones
    // can't be attached to two accounts, which is fine — they'll use email or an usher code.
    await admin.auth.admin.updateUserById(uid, { phone, phone_confirm: true }).catch(() => undefined);
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email: authEmail, password });
  if (signInError) {
    await rollback();
    console.error("[register] session failed", signInError.code);
    return { ok: false, message: "We couldn't sign you in. Please try again." };
  }

  const { error: regError } = await supabase.rpc("register_self", { p_profile: profile, p_private: privateDetails });
  if (regError) {
    await rollback();
    return { ok: false, message: friendlyDbError(regError) };
  }

  await rememberDevice({ uid, firstName: v.first_name, lastName: v.last_name, email });
  return { ok: true, data: { redirectTo: next } };
}

// ── One-time codes (email / SMS) ──────────────────────────────────
function otpErrorMessage(error: { message?: string; code?: string; status?: number }, kind: "email" | "phone"): string {
  console.error("[otp] send failed", { status: error.status, code: error.code, message: error.message });
  const msg = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";
  if (error.status === 429 || code.includes("rate_limit") || msg.includes("rate limit") || msg.includes("security purposes")) {
    return "Too many code requests. Please wait a minute and try again.";
  }
  if (code === "otp_disabled" || msg.includes("signups not allowed") || code === "user_not_found") {
    return kind === "email"
      ? "We couldn't find an account with that email. Check it, or register if you're new."
      : "We couldn't find an account with that number. Use email, or ask an usher for an in-person code.";
  }
  if (msg.includes("sending") || msg.includes("smtp") || code === "unexpected_failure" || (error.status ?? 0) >= 500) {
    return "Our email service couldn't send the code right now. Please try again shortly or ask an usher for an in-person code.";
  }
  return "We couldn't send a code just now. Please try again, or ask an usher for an in-person code.";
}
const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
const otpSchema = z.string().trim().regex(/^\d{6,10}$/, "Enter the code from your message");

export type CodeStepState = ActionState<{ channel: "email" | "phone" | "device"; destination: string; target: string }>;

export async function sendSignInCode(_: CodeStepState, form: FormData): Promise<CodeStepState> {
  const channel = form.get("channel") === "phone" ? "phone" : "email";
  const supabase = await createClient();

  if (channel === "phone") {
    if (!publicEnv.smsOtpEnabled) return { ok: false, message: "Text-message codes aren't available. Use email or ask an usher." };
    const phone = normalizePhone(String(form.get("phone") ?? ""));
    if (!phone) return { ok: false, fieldErrors: { phone: "Enter a valid phone number" }, message: "Please check the phone number." };
    const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
if (error) return { ok: false, message: otpErrorMessage(error, "email") };
    return { ok: true, data: { channel: "phone", destination: phone, target: phone } };
  }

  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { ok: false, fieldErrors: { email: parsed.error.issues[0]?.message ?? "Invalid email" }, message: "Please check the email address." };
  const { error } = await supabase.auth.signInWithOtp({ email: parsed.data, options: { shouldCreateUser: false } });
  if (error) {
    // Shows the real reason in the terminal running `npm run dev`
    console.error("[otp] send failed", { status: error.status, code: error.code, message: error.message });

    const msg = error.message.toLowerCase();
    if (error.status === 429 || msg.includes("rate limit") || msg.includes("security purposes")) {
      return { ok: false, message: "Too many code requests. Please wait a minute and try again." };
    }
    if (msg.includes("signups not allowed") || error.code === "otp_disabled") {
      return { ok: false, message: "We couldn't find an account with that email. Check it, or register if you're new." };
    }
    return { ok: false, message: "Our email service couldn't send the code right now. Please try again shortly." };
  }
  return { ok: true, data: { channel: "email", destination: parsed.data, target: parsed.data } };
}

/** "Continue as Ada O." — sends a code to the email remembered for this device. */
export async function sendDeviceCode(_state: CodeStepState, _form: FormData): Promise<CodeStepState> {
  const device = await readRememberedDevice();
  if (!device) return { ok: false, message: "This device no longer remembers you. Sign in another way." };
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(device.uid);
  const email = data.user?.email;
  if (!email || isSyntheticEmail(email)) {
    return { ok: false, message: "There's no email on your account. Ask an usher for an in-person sign-in code." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
if (error) return { ok: false, message: otpErrorMessage(error, "email") };
  return { ok: true, data: { channel: "device", destination: device.hint ?? "your email", target: "" } };
}

export async function verifySignInCode(_: ActionState, form: FormData): Promise<ActionState> {
  const next = safeNextPath(String(form.get("next") ?? ""), "/me");
  const channel = String(form.get("channel") ?? "email");
  const code = otpSchema.safeParse(form.get("code"));
  if (!code.success) return { ok: false, fieldErrors: { code: code.error.issues[0]?.message ?? "Invalid code" }, message: "Please check the code." };

  const supabase = await createClient();
  let error: { message?: string } | null = null;

  if (channel === "phone") {
    const phone = normalizePhone(String(form.get("target") ?? ""));
    if (!phone) return { ok: false, message: "Start again and re-enter your phone number." };
    ({ error } = await supabase.auth.verifyOtp({ phone, token: code.data, type: "sms" }));
  } else {
    let email: string | null = null;
    if (channel === "device") {
      // Never trust an email posted by the browser for the device flow.
      const device = await readRememberedDevice();
      if (device) {
        const { data } = await createAdminClient().auth.admin.getUserById(device.uid);
        email = data.user?.email ?? null;
      }
    } else {
      const parsed = emailSchema.safeParse(form.get("target"));
      email = parsed.success ? parsed.data : null;
    }
    if (!email) return { ok: false, message: "Start again and re-enter your email." };
    ({ error } = await supabase.auth.verifyOtp({ email, token: code.data, type: "email" }));
  }

  if (error) return { ok: false, fieldErrors: { code: "That code is incorrect or has expired" }, message: "That code didn't work." };

  await rememberSignedInUser();
  redirect(next);
}

// ── In-person (usher) code ────────────────────────────────────────

export async function redeemUsherCode(_: ActionState, form: FormData): Promise<ActionState> {
  const next = safeNextPath(String(form.get("next") ?? ""), "/me");
  const raw = String(form.get("code") ?? "");
  if (!isWellFormedRecoveryCode(raw)) {
    return { ok: false, fieldErrors: { code: "Codes are 8 letters and numbers, like ABCD-2345" }, message: "Please check the code." };
  }

  const admin = createAdminClient();
  const { data: result, error } = await admin.rpc("redeem_recovery_code", { p_code_hash: hashRecoveryCode(raw) });
  const r = (result ?? {}) as { status?: string; member_id?: string; auth_user_id?: string | null; email?: string | null; first_name?: string; last_name?: string };
  if (error || r.status !== "ok" || !r.member_id) {
    return { ok: false, fieldErrors: { code: "That code is incorrect, used or expired" }, message: "Ask the usher for a new code." };
  }

  const password = randomPassword();
  let uid = r.auth_user_id ?? null;
  let authEmail: string | null = null;

  if (!uid) {
    // Usher-registered member signing in for the first time: create their account.
    let candidate = r.email ?? syntheticEmailFor(randomUUID());
    let created = await admin.auth.admin.createUser({ email: candidate, password, email_confirm: true });
    if (created.error && isEmailTaken(created.error)) {
      candidate = syntheticEmailFor(randomUUID());
      created = await admin.auth.admin.createUser({ email: candidate, password, email_confirm: true });
    }
    if (created.error || !created.data.user) return { ok: false, message: "We couldn't set up your account. Please ask an usher." };
    uid = created.data.user.id;
    authEmail = candidate;
    const { error: linkError } = await admin.rpc("link_member_auth_user", { p_member_id: r.member_id, p_auth_user_id: uid });
    if (linkError) {
      await admin.auth.admin.deleteUser(uid).catch(() => undefined);
      return { ok: false, message: "We couldn't link your account. Please ask an usher." };
    }
  } else {
    const { data: u } = await admin.auth.admin.getUserById(uid);
    authEmail = u.user?.email ?? null;
    const { error: pwError } = await admin.auth.admin.updateUserById(uid, { password });
    if (pwError || !authEmail) return { ok: false, message: "We couldn't sign you in. Please ask an usher." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: authEmail!, password });
  if (signInError) return { ok: false, message: "We couldn't sign you in. Please ask an usher." };

  await rememberDevice({ uid, firstName: r.first_name ?? "", lastName: r.last_name ?? "", email: r.email });
  redirect(next);
}

// ── Sign out ──────────────────────────────────────────────────────

/** Sign out on this device but keep "Continue as …" for next time. */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}

/** "Not me / use another account": sign out and forget this device. */
export async function forgetDeviceAction(form: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  await forgetDevice();
  const next = safeNextPath(String(form.get("next") ?? ""), "/sign-in");
  redirect(next.startsWith("/c/") || next.startsWith("/sign-in") ? next : `/sign-in?next=${encodeURIComponent(next)}`);
}

/** Sign out of every device (refresh tokens revoked by Supabase). */
export async function signOutEverywhereAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  await forgetDevice();
  redirect("/sign-in");
}

async function rememberSignedInUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: member } = await supabase
    .from("members")
    .select("first_name, preferred_name, last_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  await rememberDevice({
    uid: user.id,
    firstName: member?.preferred_name || member?.first_name || "",
    lastName: member?.last_name ?? "",
    email: user.email,
  });
}
