"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/session";
import { errorMessage, friendlyDbError, invalid, type ActionState } from "@/lib/actions/result";
import { localInputToUtcIso } from "@/lib/time";

// All three go through SECURITY DEFINER functions that re-check the role,
// require a reason and write the audit log (actor + reason) in the same
// transaction. The client never supplies the acting admin.

const recordSchema = z.object({
  member_id: z.string().uuid("Choose a member"),
  service_id: z.string().uuid("Choose a service"),
  mode: z.enum(["physical", "online"]),
  method: z.enum(["manual", "admin_assisted"]),
  reason: z.string().trim().min(3, "Say why this is being recorded manually").max(500),
  checked_in_at: z.string().optional(),
});

export async function recordAttendance(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("attendance.manage");
    const parsed = recordSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_record_attendance", {
      p_member_id: v.member_id,
      p_service_id: v.service_id,
      p_mode: v.mode,
      p_method: v.method,
      p_reason: v.reason,
      p_checked_in_at: localInputToUtcIso(v.checked_in_at) ?? undefined,
    });
    if (error) return { ok: false, message: friendlyDbError(error) };
    const status = (data as { status?: string } | null)?.status;
    revalidatePath("/admin/attendance");
    revalidatePath(`/admin/services/${v.service_id}`);
    revalidatePath(`/admin/members/${v.member_id}`);
    return status === "already_checked_in"
      ? { ok: true, message: "Already checked in for this service — nothing changed" }
      : { ok: true, message: "Attendance recorded" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

const updateSchema = z.object({
  attendance_id: z.string().uuid(),
  mode: z.enum(["physical", "online"]),
  checked_in_at: z.string().optional(),
  reason: z.string().trim().min(3, "Say why this is being corrected").max(500),
});

export async function correctAttendance(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("attendance.manage");
    const parsed = updateSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_update_attendance", {
      p_attendance_id: v.attendance_id,
      p_mode: v.mode,
      p_checked_in_at: localInputToUtcIso(v.checked_in_at),
      p_reason: v.reason,
    });
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidatePath("/admin/attendance");
    return { ok: true, message: "Attendance corrected" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

export async function removeAttendance(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("attendance.manage");
    const id = z.string().uuid().parse(form.get("attendance_id"));
    const reason = z.string().trim().min(3, "A reason is required").max(500).safeParse(form.get("reason"));
    if (!reason.success) return { ok: false, message: "Give a reason for removing this record." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_remove_attendance", { p_attendance_id: id, p_reason: reason.data });
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidatePath("/admin/attendance");
    return { ok: true, message: "Attendance record removed" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}
