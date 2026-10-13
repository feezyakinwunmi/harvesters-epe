import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicEnv } from "@/lib/env";

/**
 * Anonymous client with no cookies or session, for data every visitor may
 * read (published content, public settings). Because it doesn't depend on
 * the request, its results can be cached across visitors with
 * unstable_cache. RLS still applies: this sees exactly what `anon` sees.
 */
export function createPublicClient() {
  return createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
