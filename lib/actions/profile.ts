"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError, invalid, type ActionState } from "@/lib/actions/result";
import { privateFromForm, privateSchema, profileFromForm, profileSchema, toProfileJson } from "@/lib/validation/member";
import { normalizePhone } from "@/lib/text";

export async function updateMyProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const profile = profileSchema.safeParse(profileFromForm(form));
  if (!profile.success) return invalid(profile.error);
  const priv = privateSchema.safeParse(privateFromForm(form));
  if (!priv.success) return invalid(priv.error);

  const supabase = await createClient();
  const json = toProfileJson(profile.data, normalizePhone);
  const { error } = await supabase.rpc("update_my_profile", {
    p_profile: json,
    p_private: {
      ...priv.data,
      emergency_contact_phone: priv.data.emergency_contact_phone ? (normalizePhone(priv.data.emergency_contact_phone) ?? priv.data.emergency_contact_phone) : "",
    },
  });
  if (error) return { ok: false, message: friendlyDbError(error) };
  revalidatePath("/me");
  return { ok: true, message: "Profile saved" };
}

const AVATAR_PATH = /^[0-9a-f-]{36}\/avatar-[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i;

/** Called after the browser uploaded into member-avatars/<uid>/… (RLS-checked). */
export async function setMyProfilePhoto(path: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  if (!AVATAR_PATH.test(path) || !path.startsWith(`${user.id}/`)) return { ok: false, message: "Invalid photo." };

  const { data: me } = await supabase.from("members").select("profile_photo_path").eq("auth_user_id", user.id).maybeSingle();
  const { error } = await supabase.rpc("set_my_profile_photo", { p_path: path });
  if (error) return { ok: false, message: friendlyDbError(error) };
  if (me?.profile_photo_path && me.profile_photo_path !== path) {
    await supabase.storage.from("member-avatars").remove([me.profile_photo_path]);
  }
  revalidatePath("/me");
  return { ok: true, message: "Photo updated" };
}

export async function removeMyProfilePhoto(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { data: me } = await supabase.from("members").select("profile_photo_path").eq("auth_user_id", user.id).maybeSingle();
  const { error } = await supabase.rpc("set_my_profile_photo", { p_path: null });
  if (error) return { ok: false, message: friendlyDbError(error) };
  if (me?.profile_photo_path) await supabase.storage.from("member-avatars").remove([me.profile_photo_path]);
  revalidatePath("/me");
  return { ok: true, message: "Photo removed" };
}
