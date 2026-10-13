"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/session";
import { errorMessage, friendlyDbError, invalid, type ActionState } from "@/lib/actions/result";
import { localInputToUtcIso } from "@/lib/time";

const followUpSchema = z.object({
  member_id: z.string().uuid(),
  subject: z.string().trim().min(2, "Add a short subject").max(200),
  details: z.string().trim().max(2000).optional(),
  priority: z.enum(["low", "normal", "high"]),
  due_at: z.string().optional(),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
});

export async function createFollowUp(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("followup.manage");
    const parsed = followUpSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.from("follow_ups").insert({
      member_id: v.member_id,
      subject: v.subject,
      details: v.details || null,
      priority: v.priority,
      due_at: localInputToUtcIso(v.due_at),
      assigned_to: v.assigned_to || null,
    });
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidatePath(`/admin/members/${v.member_id}`);
    revalidatePath("/admin/follow-up");
    return { ok: true, message: "Follow-up added" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

export async function setFollowUpStatus(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("followup.manage");
    const id = z.string().uuid().parse(form.get("id"));
    const status = z.enum(["open", "in_progress", "completed", "cancelled"]).parse(form.get("status"));
    const supabase = await createClient();
    const { error } = await supabase
      .from("follow_ups")
      .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return { ok: false, message: friendlyDbError(error) };
    revalidatePath("/admin/follow-up");
    return { ok: true, message: status === "completed" ? "Marked as done" : "Status updated" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

const contactSchema = z.object({
  member_id: z.string().uuid(),
  follow_up_id: z.string().uuid().optional().or(z.literal("")),
  channel: z.enum(["whatsapp", "phone", "sms", "email", "in_person", "other"]),
  message_summary: z.string().trim().min(2, "Summarise the conversation").max(2000),
  outcome: z.string().trim().max(500).optional(),
  next_step: z.string().trim().max(500).optional(),
  contacted_at: z.string().optional(),
  complete_follow_up: z.string().optional(),
});

/** Log a conversation. Optionally closes the linked follow-up. Never sends anything itself. */
export async function logContact(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission("followup.manage");
    const parsed = contactSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.from("member_contact_logs").insert({
      member_id: v.member_id,
      follow_up_id: v.follow_up_id || null,
      channel: v.channel,
      message_summary: v.message_summary,
      outcome: v.outcome || null,
      next_step: v.next_step || null,
      contacted_at: localInputToUtcIso(v.contacted_at) ?? new Date().toISOString(),
    });
    if (error) return { ok: false, message: friendlyDbError(error) };
    if (v.follow_up_id && v.complete_follow_up === "on") {
      await supabase.from("follow_ups").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", v.follow_up_id);
    }
    revalidatePath(`/admin/members/${v.member_id}`);
    revalidatePath("/admin/follow-up");
    return { ok: true, message: "Contact logged" };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}
