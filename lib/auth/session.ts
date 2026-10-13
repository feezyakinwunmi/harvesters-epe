import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { can, isAdminRole, type AdminRole, type Permission } from "@/lib/auth/permissions";
import type { Tables } from "@/types/database";

/**
 * The verified Supabase user for this request. getClaims() checks the JWT
 * signature (locally with asymmetric signing keys, otherwise via the Auth
 * server), which saves a network round trip on every page. Data access is
 * still enforced by RLS on every query.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (error || !c?.sub) return null;
  return {
    id: c.sub,
    aud: typeof c.aud === "string" ? c.aud : "authenticated",
    role: c.role,
    email: c.email,
    phone: c.phone,
    is_anonymous: c.is_anonymous,
    app_metadata: c.app_metadata ?? {},
    user_metadata: c.user_metadata ?? {},
    created_at: "",
  } as User;
});

export const getAdminRoles = cache(async (): Promise<AdminRole[]> => {
  const user = await getSessionUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("admin_roles").select("role").eq("user_id", user.id);
  return (data ?? []).map((r) => r.role).filter(isAdminRole);
});

export const getCurrentMember = cache(async (): Promise<Tables<"members"> | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  return data ?? null;
});

export type AdminContext = {
  user: User;
  roles: AdminRole[];
  can: (permission: Permission) => boolean;
};

/**
 * For admin pages. Redirects to sign-in when signed out; returns null when
 * signed in but without the permission (the page then renders <AccessDenied/>).
 */
export async function getAdminContext(permission: Permission, nextPath = "/admin"): Promise<AdminContext | null> {
  const user = await getSessionUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  const roles = await getAdminRoles();
  if (!can(roles, permission)) return null;
  return { user, roles, can: (p) => can(roles, p) };
}

export class NotAuthorisedError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "NotAuthorisedError";
  }
}

/** For server actions. Throws when the caller lacks the permission. */
export async function requirePermission(permission: Permission): Promise<AdminContext> {
  const user = await getSessionUser();
  if (!user) throw new NotAuthorisedError("Your session has ended. Please sign in again.");
  const roles = await getAdminRoles();
  if (!can(roles, permission)) throw new NotAuthorisedError();
  return { user, roles, can: (p) => can(roles, p) };
}
