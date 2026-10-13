"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { SETTINGS_TAG } from "@/lib/settings";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/session";
import { ADMIN_ROLES } from "@/lib/auth/permissions";
import { errorMessage, friendlyDbError, invalid, type ActionState } from "@/lib/actions/result";

// Role changes: super admins only (checked here, by RLS on admin_roles, and a
// trigger that refuses to remove the last super admin). Every change is audited.

export async function grantRole(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("roles.manage");
    const parsed = z
      .object({ member_id: z.string().uuid("Choose a member"), role: z.enum(ADMIN_ROLES) })
      .safeParse({ member_id: form.get("member_id"), role: form.get("role") });
    if (!parsed.success) return invalid(parsed.error);
    const supabase = await createClient();
    const { data: member } = await supabase.from("members").select("auth_user_id, first_name").eq("id", parsed.data.member_id).maybeSingle();
    if (!member) return { ok: false, message: "Member not found." };
    if (!member.auth_user_id) {
      return { ok: false, message: `${member.first_name} doesn't have a sign-in account yet. Ask them to register on their phone, or issue an in-person sign-in code first.` };
    }
    const { error } = await supabase.from("admin_roles").insert({ user_id: member.auth_user_id, role: parsed.data.role });
    if (error?.code === "23505") return { ok: false, message: "They already have that role." };
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidatePath("/admin/roles");
    return { ok: true, message: "Role granted" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

export async function revokeRole(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("roles.manage");
    const id = z.string().uuid().parse(form.get("id"));
    const supabase = await createClient();
    const { error } = await supabase.from("admin_roles").delete().eq("id", id);
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidatePath("/admin/roles");
    return { ok: true, message: "Role removed" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(160),
  campus: z.string().trim().min(2).max(80),
  short_name: z.string().trim().min(2).max(60),
  support_contact: z.string().trim().max(120).optional(),
  opens_minutes_before: z.coerce.number().int().min(0).max(240),
  closes_minutes_after: z.coerce.number().int().min(0).max(480),
  recognition_categories: z.string().max(2000),
});

export async function saveSettings(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const ctx = await requirePermission("settings.manage");
    const parsed = settingsSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    const categories: string[] = [...new Set(String(v.recognition_categories).split("\n").map((c: string) => c.trim()).filter(Boolean))].slice(0, 30);
    if (categories.some((c) => c.length > 80)) return { ok: false, fieldErrors: { recognition_categories: "Keep each title under 80 characters" } };
    const supabase = await createClient();
    const { error } = await supabase.from("app_settings").upsert([
      {
        key: "church",
        value: { name: v.name, campus: v.campus, short_name: v.short_name, timezone: process.env.NEXT_PUBLIC_APP_TIMEZONE || "Africa/Lagos", support_contact: v.support_contact ?? "" },
        updated_by: ctx.user.id,
      },
      { key: "check_in", value: { opens_minutes_before: v.opens_minutes_before, closes_minutes_after: v.closes_minutes_after }, updated_by: ctx.user.id },
      { key: "recognition_categories", value: categories, updated_by: ctx.user.id },
    ]);
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidateTag(SETTINGS_TAG);
    revalidatePath("/", "layout");
    return { ok: true, message: "Settings saved" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}
