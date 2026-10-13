"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/session";
import { errorMessage, friendlyDbError, invalid, type ActionState } from "@/lib/actions/result";
import { mintSessionToken } from "@/lib/qr/session-qr";
import { addMinutesIso, localInputToUtcIso } from "@/lib/time";
import { getSettings } from "@/lib/settings";


const serviceSchema = z
  .object({
    service_id: z.string().uuid().optional().or(z.literal("")),
    title: z.string().trim().min(2, "Give the service a title").max(160),
    description: z.string().trim().max(2000).optional(),
    service_type: z.string().max(40),
    starts_at: z.string().min(1, "Choose a start time"),
    ends_at: z.string().min(1, "Choose an end time"),
    location: z.string().trim().max(200).optional(),
    status: z.enum(["draft", "scheduled", "active", "closed", "cancelled"]),
    allow_physical_attendance: z.boolean(),
    allow_online_attendance: z.boolean(),
    create_session: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const s = localInputToUtcIso(v.starts_at);
    const e = localInputToUtcIso(v.ends_at);
    if (!s) ctx.addIssue({ code: "custom", path: ["starts_at"], message: "Enter a valid start time" });
    if (!e) ctx.addIssue({ code: "custom", path: ["ends_at"], message: "Enter a valid end time" });
    if (s && e && e <= s) ctx.addIssue({ code: "custom", path: ["ends_at"], message: "End time must be after the start" });
    if (!v.allow_physical_attendance && !v.allow_online_attendance) {
      ctx.addIssue({ code: "custom", path: ["allow_physical_attendance"], message: "Allow in-person, online, or both" });
    }
  });

export async function saveService(_: ActionState, form: FormData): Promise<ActionState> {
  let target: string | null = null;
  try {
    await requirePermission("services.manage");
    const parsed = serviceSchema.safeParse({
      ...Object.fromEntries(form),
      allow_physical_attendance: form.get("allow_physical_attendance") === "on",
      allow_online_attendance: form.get("allow_online_attendance") === "on",
      create_session: form.get("create_session") === "on",
    });
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    const startsAt = localInputToUtcIso(v.starts_at)!;
    const endsAt = localInputToUtcIso(v.ends_at)!;
    const supabase = await createClient();
    const row = {
      title: v.title,
      description: v.description || null,
      service_type: v.service_type,
      starts_at: startsAt,
      ends_at: endsAt,
      location: v.location || null,
      status: v.status,
      allow_physical_attendance: v.allow_physical_attendance,
      allow_online_attendance: v.allow_online_attendance,
    };

    if (v.service_id) {
      const { error } = await supabase.from("services").update(row).eq("id", v.service_id);
      if (error) return { ok: false, message: friendlyDbError(error) };
      revalidatePath(`/admin/services/${v.service_id}`);
      revalidatePath("/admin/services");
      return { ok: true, message: "Service saved" };
    }

    const { data: created, error } = await supabase.from("services").insert(row).select("id").single();
    if (error || !created) return { ok: false, message: friendlyDbError(error) };

    if (v.create_session) {
      const { checkIn } = await getSettings();
      const res = await insertSession(created.id, "Main attendance", addMinutesIso(startsAt, -checkIn.opens_minutes_before), addMinutesIso(endsAt, checkIn.closes_minutes_after), v.allow_online_attendance);
      if (!res.ok) return res;
    }
    revalidatePath("/admin/services");
    target = `/admin/services/${created.id}`;
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
  if (target) redirect(target);
  return { ok: false };
}

async function insertSession(serviceId: string, label: string, startsAt: string, endsAt: string, withOnline: boolean): Promise<ActionState> {
  const supabase = await createClient();
  const id = randomUUID();
  const physical = mintSessionToken(id, "physical");
  const online = withOnline ? mintSessionToken(id, "online") : null;
  const { error } = await supabase.from("attendance_sessions").insert({
    id,
    service_id: serviceId,
    label,
    qr_token_hash: physical.hash,
    qr_token_nonce: physical.nonce,
    online_token_hash: online?.hash ?? null,
    online_token_nonce: online?.nonce ?? null,
    starts_at: startsAt,
    ends_at: endsAt,
  });
  if (error) return { ok: false, message: friendlyDbError(error) };
  return { ok: true };
}

const sessionSchema = z.object({
  service_id: z.string().uuid(),
  label: z.string().trim().min(1, "Add a label").max(120),
  starts_at: z.string().min(1, "Choose when check-in opens"),
  ends_at: z.string().min(1, "Choose when check-in closes"),
});

/** Each attendance session has its own unique QR (and online link). */
export async function createSession(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("services.manage");
    const parsed = sessionSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    const s = localInputToUtcIso(v.starts_at);
    const e = localInputToUtcIso(v.ends_at);
    if (!s || !e || e <= s) return { ok: false, fieldErrors: { ends_at: "Closing time must be after opening time" }, message: "Please check the times." };
    const supabase = await createClient();
    const { data: service } = await supabase.from("services").select("allow_online_attendance").eq("id", v.service_id).maybeSingle();
    if (!service) return { ok: false, message: "Service not found." };
    const res = await insertSession(v.service_id, v.label, s, e, service.allow_online_attendance);
    if (!res.ok) return res;
    revalidatePath(`/admin/services/${v.service_id}`);
    return { ok: true, message: "QR session created" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

export async function setSessionEnabled(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("services.manage");
    const id = z.string().uuid().parse(form.get("session_id"));
    const enabled = form.get("enabled") === "true";
    const supabase = await createClient();
    const { data, error } = await supabase.from("attendance_sessions").update({ is_enabled: enabled }).eq("id", id).select("service_id").single();
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidatePath(`/admin/services/${data.service_id}`);
    return { ok: true, message: enabled ? "Check-in enabled" : "Check-in paused" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

/** Close now: ends the window immediately. Records are kept. */
export async function closeSessionNow(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("services.manage");
    const id = z.string().uuid().parse(form.get("session_id"));
    const supabase = await createClient();
    const { data: session } = await supabase.from("attendance_sessions").select("starts_at, service_id").eq("id", id).single();
    if (!session) return { ok: false, message: "Session not found." };
    const now = new Date();
    const endsAt = new Date(Math.max(now.getTime(), new Date(session.starts_at).getTime() + 60_000)).toISOString();
    const { error } = await supabase.from("attendance_sessions").update({ ends_at: endsAt }).eq("id", id);
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidatePath(`/admin/services/${session.service_id}`);
    return { ok: true, message: "Check-in closed" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

/** Adds an online link to an older session once online attendance is switched on. */
export async function addOnlineLink(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("services.manage");
    const id = z.string().uuid().parse(form.get("session_id"));
    const online = mintSessionToken(id, "online");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("attendance_sessions")
      .update({ online_token_hash: online.hash, online_token_nonce: online.nonce })
      .eq("id", id)
      .is("online_token_hash", null)
      .select("service_id")
      .single();
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidatePath(`/admin/services/${data.service_id}`);
    return { ok: true, message: "Online check-in link created" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

/** Services are soft-deleted (cancelled + hidden); attendance is never removed. */
export async function cancelService(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("services.manage");
    const id = z.string().uuid().parse(form.get("service_id"));
    const supabase = await createClient();
    const { error } = await supabase.from("services").update({ status: "cancelled" }).eq("id", id);
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidatePath(`/admin/services/${id}`);
    revalidatePath("/admin/services");
    return { ok: true, message: "Service cancelled" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

export async function archiveService(_: ActionState, form: FormData): Promise<ActionState> {
  let done = false;
  try {
    await requirePermission("services.manage");
    if (form.get("confirm") !== "DELETE") return { ok: false, message: "Type DELETE exactly to confirm." };
    const id = z.string().uuid().parse(form.get("service_id"));
    const supabase = await createClient();
    const { error } = await supabase.from("services").update({ deleted_at: new Date().toISOString(), status: "cancelled" }).eq("id", id);
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidatePath("/admin/services");
    done = true;
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
  if (done) redirect("/admin/services?removed=1");
  return { ok: false };
}
