"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { authCookieOptions } from "@/lib/supabase/cookie-options";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Browser client (used for direct-to-Storage uploads; RLS applies). */
export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
      { cookieOptions: authCookieOptions },
    );
  }
  return client;
}
