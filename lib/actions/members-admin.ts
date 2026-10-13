"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/session";
import { errorMessage, friendlyDbError, invalid, type ActionState } from "@/lib/actions/result";
import { privateFromForm, privateSchema, profileFromForm, profileSchema, toProfileJson } from "@/lib/validation/member";
import { formatRecoveryCode, generateRecoveryCode, hashRecoveryCode } from "@/lib/qr/token";
import { normalizePhone } from "@/lib/text";

const uuid = z.string().uuid();

/** Create (no member_id) or update a member. Columns the role may not touch are never sent. */
export async function saveMemberAdmin(_: ActionState, form: FormData): Promise<ActionState<{ memberId: string }>> {
  let createdId: string | null = null;
  try {
    const memberIdRaw = String(form.get("member_id") ?? "");
    const isNew = memberIdRaw === "";
    const ctx = await requirePermission(isNew ? "members.create" : "members.edit");
    if (!isNew && !uuid.safeParse(memberIdRaw).success) return { ok: false, message: "Unknown member." };

    const profile = profileSchema.safeParse(profileFromForm(form));
    if (!profile.success) return invalid(profile.error);

    const canPrivate = ctx.can("members.edit_private");
    let privateJson: Record<string, string> = {};
    let adminJson: Record<string, string | boolean> = {};
    if (canPrivate) {
      const priv = privateSchema.safeParse(privateFromForm(form));
      if (!priv.success) return invalid(priv.error);
      privateJson = {
        residential_address: priv.data.residential_address ?? "",
        date_of_birth: priv.data.date_of_birth ?? "",
        emergency_contact_name: priv.data.emergency_contact_name ?? "",
        emergency_contact_phone: priv.data.emergency_contact_phone ? (normalizePhone(priv.data.emergency_contact_phone) ?? priv.data.emergency_contact_phone) : "",
      };
      const status = z.enum(["first_timer", "visitor", "regular_attendee", "member", "inactive"]).safeParse(form.get("membership_status"));
      if (status.success) adminJson = { membership_status: status.data, is_first_timer: form.get("is_first_timer") === "on" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_save_member", {
      p_member_id: isNew ? null : memberIdRaw,
      p_profile: toProfileJson(profile.data, normalizePhone),
      p_private: privateJson,
      p_admin: adminJson,
    });
    if (error || !data) return { ok: false, message: friendlyDbError(error) };

    revalidatePath("/admin/members");
    if (!isNew) {
      revalidatePath(`/admin/members/${data}`);
      return { ok: true, message: "Member saved", data: { memberId: data } };
    }
    createdId = data;
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
  redirect(`/admin/members/${createdId}?created=1`);
}

export async function archiveMember(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("members.archive");
    const id = uuid.parse(form.get("member_id"));
    const archive = form.get("archive") !== "false";
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_archive_member", { p_member_id: id, p_archive: archive });
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidatePath(`/admin/members/${id}`);
    revalidatePath("/admin/members");
    return { ok: true, message: archive ? "Member archived" : "Member restored" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

/** Permanent erasure: requires typing DELETE (checked here AND in the database). */
export async function eraseMember(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("members.erase");
    const id = uuid.parse(form.get("member_id"));
    if (form.get("confirm") !== "DELETE") return { ok: false, message: "Type DELETE exactly to confirm." };
    const supabase = await createClient();
    const { data: member } = await supabase.from("members").select("profile_photo_path").eq("id", id).maybeSingle();
    const { data: authUserId, error } = await supabase.rpc("admin_erase_member", { p_member_id: id, p_confirm: "DELETE" });
    if (error) return { ok: false, message: friendlyDbError(error) };

    const admin = createAdminClient();
    if (member?.profile_photo_path) await admin.storage.from("member-avatars").remove([member.profile_photo_path]);
    if (authUserId) {
      const { error: delError } = await admin.auth.admin.deleteUser(authUserId);
      if (delError) console.error("[erase] auth user not deleted", delError.code);
    }
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
  revalidatePath("/admin/members");
  redirect("/admin/members?erased=1");
}

/** Usher desk: issue a one-time, 15-minute sign-in code after checking the person in person. */
export async function issueRecoveryCode(_: ActionState, form: FormData): Promise<ActionState<{ code: string; expiresAt: string }>> {
  try {
    await requirePermission("members.recovery_code");
    const id = uuid.parse(form.get("member_id"));
    const code = generateRecoveryCode();
    const supabase = await createClient();
    const { data: expiresAt, error } = await supabase.rpc("admin_create_recovery_code", {
      p_member_id: id,
      p_code_hash: hashRecoveryCode(code),
      p_valid_minutes: 15,
    });
    if (error || !expiresAt) return { ok: false, message: friendlyDbError(error) };
    // The plain code is returned once to the usher's screen and never stored.
    return { ok: true, data: { code: formatRecoveryCode(code), expiresAt } };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

export async function revokeMemberSessions(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("members.revoke_sessions");
    const id = uuid.parse(form.get("member_id"));
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_revoke_member_sessions", { p_member_id: id });
    if (error) return { ok: false, message: friendlyDbError(error) };
    return { ok: true, message: data ? `Signed out of ${data} device${data === 1 ? "" : "s"}` : "No active sessions" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}
