import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicEnv } from "@/lib/env";
import { serviceRoleKey } from "@/lib/server-env";

/**
 * SERVICE-ROLE client. Bypasses RLS. Use only for the narrow set of
 * operations that cannot run as the user:
 *   - creating Auth users at registration / code redemption
 *   - redeeming in-person recovery codes
 *   - reading an Auth user's email to send a sign-in code
 *   - deleting an Auth user after permanent erasure
 * Never pass data from this client to the browser without filtering.
 */
export function createAdminClient() {
  return createClient<Database>(publicEnv.supabaseUrl, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
