"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminRoles } from "@/lib/auth/session";

export type MemberOption = {
  id: string;
  name: string;
  memberNumber: string | null;
  photoConsent: boolean;
  hasAccount: boolean;
  phoneLast4: string | null;
};

/** Type-ahead member search for admin pickers. Content admins get names only (enforced in SQL). */
export async function searchMembers(query: string): Promise<MemberOption[]> {
  const roles = await getAdminRoles();
  if (roles.length === 0) return [];
  const q = query.trim().slice(0, 60);
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_member_picker", { p_query: q, p_limit: 12 });
  if (error || !data) return [];
  return data
    .filter((r) => r.id)
    .map((r) => ({
      id: r.id as string,
      name: r.display_name ?? "",
      memberNumber: r.member_number,
      photoConsent: Boolean(r.photo_consent),
      hasAccount: Boolean(r.has_account),
      phoneLast4: r.phone_last4,
    }));
}
