"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/data/content";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/session";
import { errorMessage, friendlyDbError, invalid, type ActionState } from "@/lib/actions/result";
import { isSafeMediaPath } from "@/lib/validation/content";

// Recognitions are always chosen by a person with the content role — never
// computed from attendance or personal data. Publishing requires the member's
// photo/recognition consent (enforced by a database trigger too).

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  member_id: z.string().uuid().optional().or(z.literal("")),
  display_name: z.string().trim().min(1, "How should the name appear?").max(120),
  recognition_title: z.string().trim().min(2, "Choose a recognition").max(80),
  description: z.string().trim().max(400).optional(),
  image_path: z.string().max(200).optional(),
  service_id: z.string().uuid().optional().or(z.literal("")),
  display_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  display_order: z.coerce.number().int().min(0).max(999),
  intent: z.enum(["draft", "publish"]),
});

export async function saveRecognition(_: ActionState, form: FormData): Promise<ActionState> {
  let created = false;
  try {
    await requirePermission("content.manage");
    const parsed = schema.safeParse({ ...Object.fromEntries(form), intent: form.get("intent") === "publish" ? "publish" : "draft" });
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    if (v.image_path && !isSafeMediaPath(v.image_path, "recognitions")) return { ok: false, message: "Upload the image again." };
    const supabase = await createClient();
    const row = {
      member_id: v.member_id || null,
      display_name: v.display_name,
      recognition_title: v.recognition_title,
      description: v.description || null,
      image_path: v.image_path || null,
      service_id: v.service_id || null,
      display_date: v.display_date,
      display_order: v.display_order,
      ...(v.intent === "publish" ? { status: "published" as const } : {}),
    };
    if (v.id) {
      const { data: before } = await supabase.from("member_recognitions").select("image_path").eq("id", v.id).maybeSingle();
      const { error } = await supabase.from("member_recognitions").update(row).eq("id", v.id);
      if (error) return { ok: false, message: friendlyDbError(error) };
      if (before?.image_path && before.image_path !== row.image_path) await supabase.storage.from("church-public-media").remove([before.image_path]);
    } else {
      const { error } = await supabase.from("member_recognitions").insert(row);
      if (error) return { ok: false, message: friendlyDbError(error) };
      created = true;
    }
    revalidatePath("/admin/recognitions");
    revalidatePath("/today");
    revalidateTag(CONTENT_TAG);
    if (!created) return { ok: true, message: v.intent === "publish" ? "Published" : "Saved" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
  redirect("/admin/recognitions?saved=1");
}

export async function setRecognitionStatus(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("content.manage");
    const id = z.string().uuid().parse(form.get("id"));
    const status = z.enum(["draft", "published", "archived"]).parse(form.get("status"));
    const supabase = await createClient();
    const { error } = await supabase.from("member_recognitions").update({ status }).eq("id", id);
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidatePath("/admin/recognitions");
    revalidatePath("/today");
    revalidateTag(CONTENT_TAG);
    return { ok: true, message: status === "published" ? "Published" : status === "archived" ? "Archived" : "Moved to drafts" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

export async function deleteRecognition(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("content.manage");
    const id = z.string().uuid().parse(form.get("id"));
    const supabase = await createClient();
    const { data: before } = await supabase.from("member_recognitions").select("image_path").eq("id", id).maybeSingle();
    const { error } = await supabase.from("member_recognitions").delete().eq("id", id);
    if (error) return { ok: false, message: friendlyDbError(error) };
    if (before?.image_path) await supabase.storage.from("church-public-media").remove([before.image_path]);
    revalidatePath("/admin/recognitions");
    revalidatePath("/today");
    revalidateTag(CONTENT_TAG);
    return { ok: true, message: "Recognition deleted" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}
